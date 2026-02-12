import { afterEach, describe, expect, it } from "vitest";
import { platformLogin, setupTestApp, tenantRegisterAndLogin } from "./helpers";

describe("audit project context", () => {
  let app: Awaited<ReturnType<typeof setupTestApp>> | null = null;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
  });

  it("writes project-scoped audit entries with trace/reason/ticket for privileged data operations", async () => {
    app = await setupTestApp();

    const tenant = await tenantRegisterAndLogin(app, { username: "audit_scope_student" });
    const platform = await platformLogin(app);

    const exportRes = await app.inject({
      method: "POST",
      url: `/platform/projects/${tenant.user.projectId}/data/export`,
      headers: { authorization: `Bearer ${platform.accessToken}` },
      payload: {
        reasonCode: "compliance_export",
        ticketRef: "TKT-2001"
      }
    });
    expect(exportRes.statusCode).toBe(200);

    const mutationRes = await app.inject({
      method: "POST",
      url: `/platform/projects/${tenant.user.projectId}/data/mutations`,
      headers: { authorization: `Bearer ${platform.accessToken}` },
      payload: {
        reasonCode: "ops_adjustment",
        ticketRef: "TKT-2002",
        ops: [
          {
            type: "tenant.user.status.set",
            userId: tenant.user.id,
            status: "active"
          }
        ]
      }
    });
    expect(mutationRes.statusCode).toBe(200);

    const reindexRes = await app.inject({
      method: "POST",
      url: `/platform/projects/${tenant.user.projectId}/data/reindex`,
      headers: { authorization: `Bearer ${platform.accessToken}` },
      payload: {
        reasonCode: "index_repair",
        ticketRef: "TKT-2003",
        targets: ["users"]
      }
    });
    expect(reindexRes.statusCode).toBe(202);

    const audits = await app.store.listPlatformAudits(tenant.user.projectId);
    const dataAudits = audits.filter((audit) =>
      ["data_export", "data_mutation", "data_reindex"].includes(audit.action)
    );

    expect(dataAudits.length).toBeGreaterThanOrEqual(3);
    for (const audit of dataAudits) {
      expect(audit.projectId).toBe(tenant.user.projectId);
      expect(audit.traceId).toBeTruthy();
      expect(audit.reasonCode).toBeTruthy();
      expect(audit.ticketRef).toBeTruthy();
      expect(audit.actorAdminId).toBeTruthy();
    }
  });
});
