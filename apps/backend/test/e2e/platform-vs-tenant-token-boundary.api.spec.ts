import { afterEach, describe, expect, it } from "vitest";
import { platformLogin, setupTestApp, tenantRegisterAndLogin } from "../helpers";

describe("platform vs tenant token boundaries", () => {
  let app: Awaited<ReturnType<typeof setupTestApp>> | null = null;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
  });

  it("rejects tenant token on /platform endpoints and platform token on /sync endpoints", async () => {
    app = await setupTestApp();

    const tenant = await tenantRegisterAndLogin(app, { username: "boundary_student" });
    const platform = await platformLogin(app);

    const tenantOnPlatform = await app.inject({
      method: "GET",
      url: "/platform/projects",
      headers: {
        authorization: `Bearer ${tenant.accessToken}`
      }
    });
    expect(tenantOnPlatform.statusCode).toBe(403);

    const platformOnSync = await app.inject({
      method: "POST",
      url: "/sync/pull",
      headers: {
        authorization: `Bearer ${platform.accessToken}`
      },
      payload: {
        deviceId: "device_a",
        checkpoints: {}
      }
    });
    expect(platformOnSync.statusCode).toBe(403);
  });
});
