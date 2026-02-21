import { afterEach, describe, expect, it } from "vitest";
import { platformLogin, setupTestApp, tenantRegisterAndLogin } from "../helpers";

describe("platform data mutation audit", () => {
  let app: Awaited<ReturnType<typeof setupTestApp>> | null = null;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
  });

  it("requires reasonCode and ticketRef and records audit", async () => {
    app = await setupTestApp();
    const tenant = await tenantRegisterAndLogin(app, { username: "auditstudent" });
    const platform = await platformLogin(app);

    const badReq = await app.inject({
      method: "POST",
      url: `/platform/projects/${tenant.user.projectId}/data/mutations`,
      headers: { authorization: `Bearer ${platform.accessToken}` },
      payload: {
        ops: [
          {
            type: "tenant.user.status.set",
            userId: tenant.user.id,
            status: "suspended"
          }
        ]
      }
    });
    expect(badReq.statusCode).toBe(400);

    const okReq = await app.inject({
      method: "POST",
      url: `/platform/projects/${tenant.user.projectId}/data/mutations`,
      headers: { authorization: `Bearer ${platform.accessToken}` },
      payload: {
        reasonCode: "security_review",
        ticketRef: "INC-4421",
        ops: [
          {
            type: "tenant.user.status.set",
            userId: tenant.user.id,
            status: "suspended"
          }
        ]
      }
    });

    expect(okReq.statusCode).toBe(200);
    const body = okReq.json() as { result: { applied: unknown[]; rejected: unknown[] } };
    expect(body.result.applied.length).toBe(1);
    expect(body.result.rejected.length).toBe(0);

    const audits = await app.store.listPlatformAudits(tenant.user.projectId);
    expect(audits.some((a) => a.action === "data_mutation" && a.reasonCode === "security_review" && a.ticketRef === "INC-4421")).toBe(true);
  });
});
