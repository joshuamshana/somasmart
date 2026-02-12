import { afterEach, describe, expect, it } from "vitest";
import { platformLogin, setupTestApp, tenantRegisterAndLogin } from "../helpers";

describe("tenant isolation under platform ops", () => {
  let app: Awaited<ReturnType<typeof setupTestApp>> | null = null;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
  });

  it("does not leak cross-project user records in tenant sync pull", async () => {
    app = await setupTestApp();

    const soma = await tenantRegisterAndLogin(app, {
      projectKey: "somasmart",
      username: "soma_student"
    });
    await tenantRegisterAndLogin(app, {
      projectKey: "rafikiplus",
      username: "rafiki_student"
    });

    const platform = await platformLogin(app);
    const mutate = await app.inject({
      method: "POST",
      url: `/platform/projects/${soma.user.projectId}/data/mutations`,
      headers: { authorization: `Bearer ${platform.accessToken}` },
      payload: {
        reasonCode: "ops_fix",
        ticketRef: "OPS-1001",
        ops: [
          {
            type: "tenant.record.upsert",
            entityType: "settings",
            entityId: "branding",
            data: { theme: "blue" }
          }
        ]
      }
    });
    expect(mutate.statusCode).toBe(200);

    const somaPull = await app.inject({
      method: "POST",
      url: "/sync/pull",
      headers: { authorization: `Bearer ${soma.accessToken}` },
      payload: {
        deviceId: "device_1",
        checkpoints: { default: 0 }
      }
    });
    expect(somaPull.statusCode).toBe(200);
    const somaChanges = (somaPull.json() as { changes: Array<{ entityType: string; entityId: string }> }).changes;
    expect(somaChanges.some((c) => c.entityType === "settings" && c.entityId === "branding")).toBe(true);

    const rafiki = await tenantRegisterAndLogin(app, {
      projectKey: "rafikiplus",
      username: "rafiki_reader"
    });

    const rafikiPull = await app.inject({
      method: "POST",
      url: "/sync/pull",
      headers: { authorization: `Bearer ${rafiki.accessToken}` },
      payload: {
        deviceId: "device_2",
        checkpoints: { default: 0 }
      }
    });
    expect(rafikiPull.statusCode).toBe(200);
    const rafikiChanges = (rafikiPull.json() as { changes: Array<{ entityType: string; entityId: string }> }).changes;
    expect(rafikiChanges.some((c) => c.entityType === "settings" && c.entityId === "branding")).toBe(false);
  });
});
