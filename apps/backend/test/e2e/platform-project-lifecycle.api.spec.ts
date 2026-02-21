import { afterEach, describe, expect, it } from "vitest";
import { platformLogin, setupTestApp } from "../helpers";

describe("platform project lifecycle", () => {
  let app: Awaited<ReturnType<typeof setupTestApp>> | null = null;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
  });

  it("creates, suspends, and activates a project", async () => {
    app = await setupTestApp();
    const { accessToken } = await platformLogin(app);

    const create = await app.inject({
      method: "POST",
      url: "/platform/projects",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        key: "projectx",
        name: "Project X"
      }
    });
    expect(create.statusCode).toBe(201);
    const created = create.json() as { id: string; status: string };
    expect(created.status).toBe("active");

    const suspend = await app.inject({
      method: "POST",
      url: `/platform/projects/${created.id}/suspend`,
      headers: { authorization: `Bearer ${accessToken}` }
    });
    expect(suspend.statusCode).toBe(200);
    expect((suspend.json() as { status: string }).status).toBe("suspended");

    const activate = await app.inject({
      method: "POST",
      url: `/platform/projects/${created.id}/activate`,
      headers: { authorization: `Bearer ${accessToken}` }
    });
    expect(activate.statusCode).toBe(200);
    expect((activate.json() as { status: string }).status).toBe("active");
  });
});
