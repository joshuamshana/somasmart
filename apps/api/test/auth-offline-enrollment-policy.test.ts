import { afterEach, describe, expect, it } from "vitest";
import { setupTestApp } from "./helpers";

function isRoughlyDaysFromNow(iso: string, days: number) {
  const targetMs = days * 24 * 60 * 60 * 1000;
  const diff = new Date(iso).getTime() - Date.now();
  const slackMs = 2 * 60 * 1000;
  return diff >= targetMs - slackMs && diff <= targetMs + slackMs;
}

describe("auth offline enrollment policy", () => {
  let app: Awaited<ReturnType<typeof setupTestApp>> | null = null;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
  });

  it("issues a 30-day offline enrollment ticket and denies suspended user on login/refresh", async () => {
    app = await setupTestApp();

    const username = "offline_policy_student";
    const password = "student12345";

    const register = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        projectKey: "somasmart",
        username,
        password,
        displayName: "Offline Policy Student",
        role: "student"
      }
    });
    expect(register.statusCode).toBe(201);

    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        projectKey: "somasmart",
        username,
        password,
        deviceId: "device_offline_policy"
      }
    });
    expect(login.statusCode).toBe(200);

    const loginBody = login.json() as {
      accessToken: string;
      refreshToken: string;
      user: { id: string; projectId: string };
      offlineEnrollment: { ticket: string; expiresAt: string; mode: string };
    };

    expect(loginBody.offlineEnrollment.mode).toBe("pin_keystore");
    expect(isRoughlyDaysFromNow(loginBody.offlineEnrollment.expiresAt, 30)).toBe(true);

    const accessClaims = (await app.jwt.verify(loginBody.accessToken)) as { sid: string };
    const session = await app.store.findTenantSessionById(accessClaims.sid);
    expect(session).not.toBeNull();
    expect(Boolean(session?.offlineTicketHash)).toBe(true);
    expect(session?.offlineTicketExpiresAt).toBeDefined();
    expect(isRoughlyDaysFromNow(session?.offlineTicketExpiresAt ?? "", 30)).toBe(true);

    const enroll = await app.inject({
      method: "POST",
      url: "/auth/offline/enroll",
      headers: {
        authorization: `Bearer ${loginBody.accessToken}`
      }
    });
    expect(enroll.statusCode).toBe(201);
    const enrollBody = enroll.json() as { ticket: string; expiresAt: string; mode: string };
    expect(enrollBody.mode).toBe("pin_keystore");
    expect(isRoughlyDaysFromNow(enrollBody.expiresAt, 30)).toBe(true);

    await app.store.updateTenantUserStatus(loginBody.user.projectId, loginBody.user.id, "suspended");

    const loginSuspended = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        projectKey: "somasmart",
        username,
        password,
        deviceId: "device_offline_policy"
      }
    });
    expect(loginSuspended.statusCode).toBe(403);
    expect((loginSuspended.json() as { code: string }).code).toBe("AUTH_SUSPENDED");

    const refreshSuspended = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken: loginBody.refreshToken }
    });
    expect(refreshSuspended.statusCode).toBe(403);
    expect((refreshSuspended.json() as { code: string }).code).toBe("AUTH_NOT_ALLOWED");
  });
});
