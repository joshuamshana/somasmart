import {
  getSyncAccessToken,
  getSyncApiBaseUrl,
  getSyncApiDisplayName,
  getSyncApiPassword,
  getSyncApiRole,
  getSyncApiUsername,
  getSyncDeviceId,
  getSyncProjectKey,
  type SyncApiRole
} from "@/shared/sync/config";

type SyncRuntimeAuthProfile = {
  username: string;
  password: string;
  displayName?: string;
  role?: SyncApiRole;
};

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
};

type RefreshResponse = {
  accessToken: string;
  refreshToken: string;
};

type TenantMeResponse = {
  id: string;
  projectId: string;
  projectKey: string;
  username: string;
  displayName: string;
  role: SyncApiRole;
  status: "active" | "pending" | "suspended";
};

type RemoteAuthErrorCode = "AUTH_INVALID" | "AUTH_SUSPENDED" | "PROJECT_NOT_AVAILABLE" | "NETWORK_ERROR" | "UNKNOWN_ERROR";

export type RemoteTenantLoginResult =
  | {
      ok: true;
      accessToken: string;
      refreshToken: string;
      user: TenantMeResponse;
    }
  | {
      ok: false;
      code: RemoteAuthErrorCode;
      message: string;
    };

let runtimeProfile: SyncRuntimeAuthProfile | null = null;
let inflightTokenRequest: Promise<string> | null = null;

function getStorageKey(suffix: string) {
  return `somasmart.sync.api.${getSyncDeviceId()}.${suffix}`;
}

function getStoredAccessToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(getStorageKey("accessToken"));
}

function getStoredRefreshToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(getStorageKey("refreshToken"));
}

function setStoredTokens(input: { accessToken: string; refreshToken: string }) {
  if (typeof window === "undefined") return;
  localStorage.setItem(getStorageKey("accessToken"), input.accessToken);
  localStorage.setItem(getStorageKey("refreshToken"), input.refreshToken);
}

function clearStoredTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(getStorageKey("accessToken"));
  localStorage.removeItem(getStorageKey("refreshToken"));
}

function getErrorCode(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  if (!("code" in payload)) return null;
  return typeof payload.code === "string" ? payload.code : null;
}

function nowMs() {
  return Date.now();
}

function parseJwtExpiryMs(token: string) {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded)) as { exp?: number };
    if (typeof payload.exp !== "number") return null;
    return payload.exp * 1000;
  } catch {
    return null;
  }
}

function isProbablyExpired(token: string) {
  const expMs = parseJwtExpiryMs(token);
  if (!expMs) return false;
  return expMs <= nowMs() + 30_000;
}

function getSyncProfileFromEnv(): SyncRuntimeAuthProfile | null {
  const username = getSyncApiUsername();
  const password = getSyncApiPassword();
  if (!username || !password) return null;
  return {
    username,
    password,
    displayName: getSyncApiDisplayName(),
    role: getSyncApiRole()
  };
}

function getActiveProfile() {
  return runtimeProfile ?? getSyncProfileFromEnv();
}

async function requestJson<T>({
  method = "POST",
  path,
  body,
  authorization
}: {
  method?: "GET" | "POST";
  path: string;
  body?: Record<string, unknown>;
  authorization?: string;
}): Promise<{ status: number; payload: T | Record<string, unknown> | null }> {
  const response = await fetch(`${getSyncApiBaseUrl()}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(authorization ? { authorization } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? ((await response.json()) as T | Record<string, unknown>) : null;
  return { status: response.status, payload };
}

async function loginWithProfile(profile: SyncRuntimeAuthProfile) {
  const loginBody = {
    projectKey: getSyncProjectKey(),
    username: profile.username,
    password: profile.password,
    deviceId: getSyncDeviceId()
  };

  const loginFirst = await requestJson<LoginResponse>({ path: "/auth/login", body: loginBody });
  if (loginFirst.status === 200 && loginFirst.payload && "accessToken" in loginFirst.payload) {
    return loginFirst.payload as LoginResponse;
  }

  const errorCode = loginFirst.payload && "code" in loginFirst.payload ? String(loginFirst.payload.code) : null;
  if (errorCode !== "AUTH_INVALID") {
    throw new Error(`Sync API login failed (${errorCode ?? `HTTP ${loginFirst.status}`}).`);
  }

  // If account does not exist yet in backend tenant, register and retry login.
  const registerAttempt = await requestJson<Record<string, unknown>>({
    path: "/auth/register",
    body: {
      projectKey: getSyncProjectKey(),
      username: profile.username,
      password: profile.password,
      displayName: profile.displayName || profile.username,
      role: profile.role || "student"
    }
  });
  const registerCode =
    registerAttempt.payload && "code" in registerAttempt.payload ? String(registerAttempt.payload.code) : null;
  if (![201, 409].includes(registerAttempt.status)) {
    throw new Error(`Sync API register failed (${registerCode ?? `HTTP ${registerAttempt.status}`}).`);
  }
  if (registerAttempt.status === 409 || registerCode === "USERNAME_EXISTS") {
    throw new Error(
      "Sync API auth failed: this username already exists in the backend project with a different password. Use the backend password, a different username, or set VITE_SYNC_API_USERNAME/VITE_SYNC_API_PASSWORD."
    );
  }

  const loginSecond = await requestJson<LoginResponse>({ path: "/auth/login", body: loginBody });
  if (loginSecond.status === 200 && loginSecond.payload && "accessToken" in loginSecond.payload) {
    return loginSecond.payload as LoginResponse;
  }
  const loginCode = loginSecond.payload && "code" in loginSecond.payload ? String(loginSecond.payload.code) : null;
  throw new Error(`Sync API login failed after register (${loginCode ?? `HTTP ${loginSecond.status}`}).`);
}

async function refreshWithToken(refreshToken: string) {
  const response = await requestJson<RefreshResponse>({
    path: "/auth/refresh",
    body: { refreshToken }
  });
  if (response.status === 200 && response.payload && "accessToken" in response.payload) {
    return response.payload as RefreshResponse;
  }
  return null;
}

async function doEnsureSyncAccessToken(input: { forceFresh?: boolean } = {}) {
  const staticToken = getSyncAccessToken();
  if (staticToken) return staticToken;

  const storedAccess = getStoredAccessToken();
  if (!input.forceFresh && storedAccess && !isProbablyExpired(storedAccess)) {
    return storedAccess;
  }

  const storedRefresh = getStoredRefreshToken();
  if (storedRefresh) {
    const refreshed = await refreshWithToken(storedRefresh);
    if (refreshed) {
      setStoredTokens(refreshed);
      return refreshed.accessToken;
    }
  }

  const profile = getActiveProfile();
  if (!profile) {
    throw new Error(
      "Sync API credentials are not configured. Set VITE_SYNC_API_USERNAME/VITE_SYNC_API_PASSWORD or log in through the frontend before syncing."
    );
  }
  const loggedIn = await loginWithProfile(profile);
  setStoredTokens(loggedIn);
  return loggedIn.accessToken;
}

export function setSyncRuntimeAuthProfile(profile: SyncRuntimeAuthProfile) {
  runtimeProfile = {
    username: profile.username.trim(),
    password: profile.password,
    displayName: profile.displayName?.trim() || undefined,
    role: profile.role
  };
}

export function clearSyncRuntimeAuthProfile() {
  runtimeProfile = null;
}

export function clearSyncApiSession() {
  clearStoredTokens();
}

export function setSyncApiSessionTokens(input: { accessToken: string; refreshToken: string }) {
  setStoredTokens(input);
}

export async function loginTenantWithPassword(input: { username: string; password: string }): Promise<RemoteTenantLoginResult> {
  const loginBody = {
    projectKey: getSyncProjectKey(),
    username: input.username.trim(),
    password: input.password,
    deviceId: getSyncDeviceId()
  };

  let loginResponse: { status: number; payload: LoginResponse | Record<string, unknown> | null };
  try {
    loginResponse = await requestJson<LoginResponse>({ path: "/auth/login", body: loginBody });
  } catch {
    return { ok: false, code: "NETWORK_ERROR", message: "Unable to reach backend authentication service." };
  }

  if (!(loginResponse.status === 200 && loginResponse.payload && "accessToken" in loginResponse.payload)) {
    const code = getErrorCode(loginResponse.payload);
    if (code === "AUTH_INVALID") return { ok: false, code: "AUTH_INVALID", message: "Invalid username/password." };
    if (code === "AUTH_SUSPENDED") return { ok: false, code: "AUTH_SUSPENDED", message: "Account suspended." };
    if (code === "PROJECT_NOT_AVAILABLE") return { ok: false, code: "PROJECT_NOT_AVAILABLE", message: "Project is not available." };
    return { ok: false, code: "UNKNOWN_ERROR", message: "Backend login failed." };
  }

  const tokens = loginResponse.payload as LoginResponse;

  let meResponse: { status: number; payload: TenantMeResponse | Record<string, unknown> | null };
  try {
    meResponse = await requestJson<TenantMeResponse>({
      method: "GET",
      path: "/auth/me",
      authorization: `Bearer ${tokens.accessToken}`
    });
  } catch {
    return { ok: false, code: "NETWORK_ERROR", message: "Unable to fetch backend user profile." };
  }

  if (!(meResponse.status === 200 && meResponse.payload && "id" in meResponse.payload)) {
    return { ok: false, code: "UNKNOWN_ERROR", message: "Backend profile fetch failed." };
  }

  setStoredTokens(tokens);
  return { ok: true, ...tokens, user: meResponse.payload as TenantMeResponse };
}

export async function ensureSyncAccessToken(input: { forceFresh?: boolean } = {}) {
  if (!inflightTokenRequest) {
    inflightTokenRequest = doEnsureSyncAccessToken(input).finally(() => {
      inflightTokenRequest = null;
    });
  }
  return inflightTokenRequest;
}
