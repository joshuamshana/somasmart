import { afterEach, describe, expect, it } from "vitest";
import { setupTestApp } from "./helpers";

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
        username: "platform_admin",
        password: "platform12345"
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
});
