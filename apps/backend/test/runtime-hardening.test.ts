import { afterEach, describe, expect, it } from "vitest";
import { loadRuntimeConfig } from "../core/config/runtimeConfig.mjs";
import { setupTestApp, tenantRegisterAndLogin, TEST_SEED } from "./helpers";

describe("runtime hardening", () => {
  const envSnapshot = { ...process.env };
  let app: Awaited<ReturnType<typeof setupTestApp>> | null = null;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
    process.env = { ...envSnapshot };
  });

  it("rejects oversized request payloads", async () => {
    process.env.MAX_JSON_BODY_BYTES = "1024";
    app = await setupTestApp();

    const hugeDisplayName = "x".repeat(2048);
    const res = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        projectKey: TEST_SEED.projectKey,
        username: "large_payload_user",
        password: "student12345",
        displayName: hugeDisplayName
      }
    });

    expect(res.statusCode).toBe(413);
    expect((res.json() as { code: string }).code).toBe("PAYLOAD_TOO_LARGE");
  });

  it("denies refresh for expired tenant session", async () => {
    app = await setupTestApp();
    const tenant = await tenantRegisterAndLogin(app, { username: "expired_session_user" });
    const claims = (await app.jwt.verify(tenant.refreshToken)) as { sid: string };

    await app.store.updateTenantSession(claims.sid, {
      expiresAt: new Date(Date.now() - 60_000).toISOString()
    });

    const refresh = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken: tenant.refreshToken }
    });

    expect(refresh.statusCode).toBe(401);
    expect((refresh.json() as { code: string }).code).toBe("AUTH_SESSION_EXPIRED");
  });

  it("validates production runtime settings", () => {
    expect(() =>
      loadRuntimeConfig({
        NODE_ENV: "production",
        DATA_STORE: "memory",
        JWT_SECRET: "123"
      })
    ).toThrow();

    const config = loadRuntimeConfig({
      NODE_ENV: "production",
      DATA_STORE: "knex",
      JWT_SECRET: "a".repeat(40),
      MAX_JSON_BODY_BYTES: "2048",
      REQUIRE_HTTPS: "true"
    });

    expect(config.nodeEnv).toBe("production");
    expect(config.dataStore).toBe("knex");
    expect(config.maxJsonBodyBytes).toBe(2048);
    expect(config.requireHttps).toBe(true);
  });
});
