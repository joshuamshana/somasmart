export type SyncMode = "mock" | "api";
export type SyncApiRole = "student" | "teacher" | "admin" | "school_admin";
export type SyncConnectionSource = "runtime_override" | "env" | "default";
export type SyncConnectionOverride = {
  baseUrl: string;
  projectKey: string;
};
export type EffectiveSyncConnection = SyncConnectionOverride & {
  source: {
    baseUrl: SyncConnectionSource;
    projectKey: SyncConnectionSource;
  };
  hasRuntimeOverride: boolean;
};

export const DEFAULT_SYNC_API_BASE_URL = "http://localhost:4000";
export const DEFAULT_SYNC_PROJECT_KEY = "somasmart";

const PROJECT_KEY_PATTERN = /^[a-z0-9_-]{2,64}$/i;
const CONNECTION_STORAGE_PREFIX = "somasmart.sync.connection";

function parseMode(value: string | undefined): SyncMode {
  if (value === "api") return "api";
  return "mock";
}

export function getSyncMode(): SyncMode {
  const explicit = parseMode(import.meta.env.VITE_SYNC_MODE);
  if (import.meta.env.VITE_SYNC_MODE) return explicit;
  // Keep tests deterministic on mock; use live API by default for normal app runs.
  if (import.meta.env.MODE === "test") return "mock";
  return "api";
}

function getConnectionStorageKey() {
  return `${CONNECTION_STORAGE_PREFIX}.${getSyncDeviceId()}`;
}

function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("Backend URL is required.");

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("Backend URL must be an absolute URL with protocol, e.g. http://localhost:4000.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Backend URL must use http or https protocol (e.g. http://localhost:4000).");
  }

  const normalized = trimmed.replace(/\/+$/, "");
  return normalized || `${parsed.protocol}//${parsed.host}`;
}

function normalizeProjectKey(value: string): string {
  const trimmed = value.trim();
  if (!PROJECT_KEY_PATTERN.test(trimmed)) {
    throw new Error("Project key must be 2-64 characters: letters, numbers, underscore, or hyphen.");
  }
  return trimmed;
}

function parseRuntimeConnection(raw: string | null): SyncConnectionOverride | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SyncConnectionOverride>;
    if (typeof parsed.baseUrl !== "string" || typeof parsed.projectKey !== "string") return null;
    return {
      baseUrl: normalizeBaseUrl(parsed.baseUrl),
      projectKey: normalizeProjectKey(parsed.projectKey)
    };
  } catch {
    return null;
  }
}

function getRuntimeSyncConnectionOverride() {
  if (typeof window === "undefined") return null;
  return parseRuntimeConnection(localStorage.getItem(getConnectionStorageKey()));
}

function safeParseEnvBaseUrl(value: string | undefined) {
  if (!value?.trim()) return null;
  try {
    return normalizeBaseUrl(value);
  } catch {
    return null;
  }
}

function safeParseEnvProjectKey(value: string | undefined) {
  if (!value?.trim()) return null;
  try {
    return normalizeProjectKey(value);
  } catch {
    return null;
  }
}

export function getEffectiveSyncConnection(): EffectiveSyncConnection {
  const runtimeOverride = getRuntimeSyncConnectionOverride();
  const envBaseUrl = safeParseEnvBaseUrl(import.meta.env.VITE_SYNC_API_URL);
  const envProjectKey = safeParseEnvProjectKey(import.meta.env.VITE_SYNC_PROJECT_KEY);

  const baseUrl = runtimeOverride?.baseUrl ?? envBaseUrl ?? DEFAULT_SYNC_API_BASE_URL;
  const projectKey = runtimeOverride?.projectKey ?? envProjectKey ?? DEFAULT_SYNC_PROJECT_KEY;

  return {
    baseUrl,
    projectKey,
    source: {
      baseUrl: runtimeOverride?.baseUrl ? "runtime_override" : envBaseUrl ? "env" : "default",
      projectKey: runtimeOverride?.projectKey ? "runtime_override" : envProjectKey ? "env" : "default"
    },
    hasRuntimeOverride: Boolean(runtimeOverride)
  };
}

export function setSyncConnectionOverride(input: SyncConnectionOverride): SyncConnectionOverride {
  const normalized = {
    baseUrl: normalizeBaseUrl(input.baseUrl),
    projectKey: normalizeProjectKey(input.projectKey)
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(getConnectionStorageKey(), JSON.stringify(normalized));
  }
  return normalized;
}

export function clearSyncConnectionOverride() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(getConnectionStorageKey());
}

export function getSyncApiBaseUrl(): string {
  return getEffectiveSyncConnection().baseUrl;
}

export function getSyncAccessToken(): string | null {
  const token = import.meta.env.VITE_SYNC_ACCESS_TOKEN?.trim();
  return token ? token : null;
}

export function getSyncProjectKey(): string {
  return getEffectiveSyncConnection().projectKey;
}

export function getSyncApiUsername(): string | null {
  const configured = import.meta.env.VITE_SYNC_API_USERNAME?.trim();
  return configured || null;
}

export function getSyncApiPassword(): string | null {
  const configured = import.meta.env.VITE_SYNC_API_PASSWORD?.trim();
  return configured || null;
}

export function getSyncApiDisplayName(): string {
  const configured = import.meta.env.VITE_SYNC_API_DISPLAY_NAME?.trim();
  return configured || "Sync User";
}

export function getSyncApiRole(): SyncApiRole {
  const configured = import.meta.env.VITE_SYNC_API_ROLE?.trim();
  if (configured === "student" || configured === "teacher" || configured === "admin" || configured === "school_admin") {
    return configured;
  }
  return "admin";
}

export function getSyncDeviceId(): string {
  const configured = import.meta.env.VITE_SYNC_DEVICE_ID?.trim();
  if (configured && configured.length >= 3) return configured;
  if (typeof window !== "undefined") {
    try {
      const url = new URL(window.location.href);
      const device = url.searchParams.get("device")?.trim();
      if (device) {
        const safe = device.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32);
        if (safe.length >= 3) return safe;
      }
    } catch {
      // ignore parsing errors and keep fallback
    }
  }
  return "web_device_default";
}
