import { afterEach, describe, expect, it } from "vitest";
import { setupTestApp, TEST_SEED } from "./helpers";

describe("platform auth", () => {
  let app: Awaited<ReturnType<typeof setupTestApp>> | null = null;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
  });

  it("logs in and rotates refresh token", async () => {
    app = await setupTestApp();
    const login = await app.inject({
      method: "POST",
      url: "/platform/auth/login",
      payload: {
        username: TEST_SEED.platformAdminUsername,
        password: TEST_SEED.platformAdminPassword
      }
    });

    expect(login.statusCode).toBe(200);
    const logged = login.json() as { refreshToken: string };

    const refresh = await app.inject({
      method: "POST",
      url: "/platform/auth/refresh",
      payload: {
        refreshToken: logged.refreshToken
      }
    });

    expect(refresh.statusCode).toBe(200);
    expect((refresh.json() as { refreshToken: string }).refreshToken).not.toBe(logged.refreshToken);
  });

  it("denies refresh when platform session is expired", async () => {
    app = await setupTestApp();
    const login = await app.inject({
      method: "POST",
      url: "/platform/auth/login",
      payload: {
        username: TEST_SEED.platformAdminUsername,
        password: TEST_SEED.platformAdminPassword
      }
    });

    expect(login.statusCode).toBe(200);
    const logged = login.json() as { refreshToken: string };
    const claims = (await app.jwt.verify(logged.refreshToken)) as { sid: string };
    await app.store.updatePlatformSession(claims.sid, {
      expiresAt: new Date(Date.now() - 60_000).toISOString()
    });

    const refresh = await app.inject({
      method: "POST",
      url: "/platform/auth/refresh",
      payload: {
        refreshToken: logged.refreshToken
      }
    });

    expect(refresh.statusCode).toBe(401);
    expect((refresh.json() as { code: string }).code).toBe("AUTH_SESSION_EXPIRED");
  });
});
