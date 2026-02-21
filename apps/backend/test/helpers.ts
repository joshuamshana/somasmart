import { getBackendStore, invokeRoute, resetRuntimeForTests } from "../core/runtime.mjs";
import { verifyJwtToken } from "../core/auth/jwt.mjs";

type InjectOptions = {
  method: string;
  url: string;
  payload?: unknown;
  headers?: Record<string, string>;
};

type InjectResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  json: <T = unknown>() => T;
};

export const TEST_SEED = {
  projectKey: "somasmart",
  projectName: "SomaSmart",
  tenantAdminUsername: "admin",
  tenantAdminPassword: "test-admin-12345",
  platformAdminUsername: "platform_admin",
  platformAdminPassword: "test-platform-12345"
} as const;

function applyTestSeedEnv() {
  process.env.DATA_STORE = "memory";
  process.env.JWT_SECRET = "test-only-jwt-secret";
  process.env.SEED_PROJECT_KEY = TEST_SEED.projectKey;
  process.env.SEED_PROJECT_NAME = TEST_SEED.projectName;
  process.env.SEED_TENANT_ADMIN_USERNAME = TEST_SEED.tenantAdminUsername;
  process.env.SEED_TENANT_ADMIN_PASSWORD = TEST_SEED.tenantAdminPassword;
  process.env.SEED_PLATFORM_ADMIN_USERNAME = TEST_SEED.platformAdminUsername;
  process.env.SEED_PLATFORM_ADMIN_PASSWORD = TEST_SEED.platformAdminPassword;
}

function stripQuery(url: string) {
  const idx = url.indexOf("?");
  return idx >= 0 ? url.slice(0, idx) : url;
}

function normalizeRequestHeaders(headers?: Record<string, string>) {
  const out: Record<string, string> = {};
  if (!headers) return out;
  for (const [key, value] of Object.entries(headers)) {
    out[key.toLowerCase()] = value;
  }
  return out;
}

function createResponseCollector() {
  let statusCode = 200;
  let body = "";
  let bodyObject: unknown = undefined;
  const headers: Record<string, string> = {};

  return {
    status(code: number) {
      statusCode = code;
      return this;
    },
    setHeader(name: string, value: unknown) {
      headers[name.toLowerCase()] = String(value);
      return this;
    },
    json(payload: unknown) {
      bodyObject = payload;
      body = JSON.stringify(payload);
      return this;
    },
    send(payload?: unknown) {
      if (payload === undefined) {
        body = "";
        bodyObject = undefined;
        return this;
      }

      if (Buffer.isBuffer(payload) || payload instanceof Uint8Array) {
        body = Buffer.from(payload).toString("utf8");
        bodyObject = body;
        return this;
      }

      if (typeof payload === "string") {
        body = payload;
        bodyObject = payload;
        return this;
      }

      bodyObject = payload;
      body = JSON.stringify(payload);
      return this;
    },
    end() {
      if (!body) body = "";
      return this;
    },
    toResponse(): InjectResponse {
      return {
        statusCode,
        headers,
        body,
        json<T = unknown>() {
          if (bodyObject !== undefined) {
            return bodyObject as T;
          }
          if (!body) {
            return undefined as T;
          }
          return JSON.parse(body) as T;
        }
      };
    }
  };
}

export async function setupTestApp() {
  applyTestSeedEnv();
  resetRuntimeForTests();
  const store = await getBackendStore();

  return {
    store,
    jwt: {
      verify: verifyJwtToken
    },
    async inject(options: InjectOptions): Promise<InjectResponse> {
      const method = options.method.toLowerCase();
      const req = {
        method: options.method.toUpperCase(),
        url: options.url,
        path: stripQuery(options.url),
        headers: normalizeRequestHeaders(options.headers),
        body: options.payload
      };

      const res = createResponseCollector();
      await invokeRoute(method, undefined, req, res);
      return res.toResponse();
    },
    async close() {
      resetRuntimeForTests();
    }
  };
}

export async function platformLogin(app: Awaited<ReturnType<typeof setupTestApp>>) {
  const res = await app.inject({
    method: "POST",
    url: "/platform/auth/login",
    payload: {
      username: TEST_SEED.platformAdminUsername,
      password: TEST_SEED.platformAdminPassword
    }
  });
  if (res.statusCode !== 200) {
    throw new Error(`Platform login failed: ${res.statusCode} ${res.body}`);
  }
  return res.json() as { accessToken: string; refreshToken: string };
}

export async function tenantRegisterAndLogin(
  app: Awaited<ReturnType<typeof setupTestApp>>,
  options?: { projectKey?: string; username?: string; password?: string; displayName?: string }
) {
  const projectKey = options?.projectKey ?? TEST_SEED.projectKey;
  const username = options?.username ?? "student1";
  const password = options?.password ?? "student12345";
  const displayName = options?.displayName ?? "Student One";

  const registerRes = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: {
      projectKey,
      username,
      password,
      displayName,
      role: "student"
    }
  });

  if (![201, 409].includes(registerRes.statusCode)) {
    throw new Error(`Tenant register failed: ${registerRes.statusCode} ${registerRes.body}`);
  }

  const loginRes = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: {
      projectKey,
      username,
      password,
      deviceId: "device_a"
    }
  });

  if (loginRes.statusCode !== 200) {
    throw new Error(`Tenant login failed: ${loginRes.statusCode} ${loginRes.body}`);
  }

  return loginRes.json() as {
    accessToken: string;
    refreshToken: string;
    user: { id: string; projectId: string; projectKey: string; username: string };
  };
}
