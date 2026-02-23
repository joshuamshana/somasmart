import { afterEach, describe, expect, it } from "vitest";
import { health } from "../functions/http.health.mjs";
import { invokeRoute, resetRuntimeForTests } from "../core/runtime.mjs";

function createResCollector() {
  let statusCode = 200;
  let payload: unknown;

  return {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(body: unknown) {
      payload = body;
      return this;
    },
    setHeader() {
      return this;
    },
    send() {
      return this;
    },
    end() {
      return this;
    },
    get result() {
      return { statusCode, payload };
    }
  };
}

describe("health/readiness", () => {
  const envSnapshot = { ...process.env };

  afterEach(() => {
    process.env = { ...envSnapshot };
    resetRuntimeForTests();
  });

  it("returns 200 with readiness details when runtime is healthy", async () => {
    process.env.DATA_STORE = "memory";
    process.env.JWT_SECRET = "test-only-jwt-secret";
    process.env.SEED_PROJECT_KEY = "somasmart";
    process.env.SEED_PROJECT_NAME = "SomaSmart";
    process.env.SEED_TENANT_ADMIN_USERNAME = "admin";
    process.env.SEED_TENANT_ADMIN_PASSWORD = "test-admin-12345";
    process.env.SEED_PLATFORM_ADMIN_USERNAME = "platform_admin";
    process.env.SEED_PLATFORM_ADMIN_PASSWORD = "test-platform-12345";

    const res = createResCollector();
    await health.onRequest({} as never, res as never);

    expect(res.result.statusCode).toBe(200);
    expect((res.result.payload as { ok: boolean; store: string }).ok).toBe(true);
    expect((res.result.payload as { store: string }).store).toBe("memory");
  });

  it("returns 503 when runtime config/bootstrap is invalid", async () => {
    process.env.NODE_ENV = "production";
    process.env.DATA_STORE = "memory";
    process.env.JWT_SECRET = "short";
    resetRuntimeForTests();

    const res = createResCollector();
    await health.onRequest({} as never, res as never);

    expect(res.result.statusCode).toBe(503);
    expect((res.result.payload as { ok: boolean }).ok).toBe(false);
  });

  it("fails closed with SERVICE_UNAVAILABLE on route invocation when runtime init fails", async () => {
    process.env.NODE_ENV = "production";
    process.env.DATA_STORE = "memory";
    process.env.JWT_SECRET = "short";
    resetRuntimeForTests();

    const res = createResCollector();
    await invokeRoute("post", "/auth/login", { method: "POST", url: "/auth/login", headers: {}, body: {} } as never, res as never);

    expect(res.result.statusCode).toBe(503);
    expect(res.result.payload).toEqual({ code: "SERVICE_UNAVAILABLE" });
  });
});
