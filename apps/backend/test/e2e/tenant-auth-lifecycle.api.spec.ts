import { afterEach, describe, expect, it } from "vitest";
import { platformLogin, setupTestApp, tenantRegisterAndLogin, TEST_SEED } from "../helpers";

describe("tenant auth lifecycle", () => {
  let app: Awaited<ReturnType<typeof setupTestApp>> | null = null;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
  });

  it("supports register/login/me/logout and blocks refresh after revoked session", async () => {
    app = await setupTestApp();
    const tenant = await tenantRegisterAndLogin(app, {
      username: "lifecycle_student",
      password: "lifecycle_pass_123",
      displayName: "Lifecycle Student"
    });

    const me = await app.inject({
      method: "GET",
      url: "/auth/me",
      headers: { authorization: `Bearer ${tenant.accessToken}` }
    });

    expect(me.statusCode).toBe(200);
    const profile = me.json() as { username: string; projectKey: string; status: string };
    expect(profile.username).toBe("lifecycle_student");
    expect(profile.projectKey).toBe(TEST_SEED.projectKey);
    expect(profile.status).toBe("active");

    const logout = await app.inject({
      method: "POST",
      url: "/auth/logout",
      headers: { authorization: `Bearer ${tenant.accessToken}` }
    });
    expect(logout.statusCode).toBe(204);

    const refreshAfterLogout = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken: tenant.refreshToken }
    });

    expect(refreshAfterLogout.statusCode).toBe(401);
    expect((refreshAfterLogout.json() as { code: string }).code).toBe("AUTH_SESSION_REVOKED");
  });

  it("rejects platform token on tenant auth routes", async () => {
    app = await setupTestApp();
    const { accessToken } = await platformLogin(app);

    const me = await app.inject({
      method: "GET",
      url: "/auth/me",
      headers: { authorization: `Bearer ${accessToken}` }
    });

    expect(me.statusCode).toBe(403);
    expect((me.json() as { code: string }).code).toBe("FORBIDDEN_TOKEN_CLASS");
  });
});
