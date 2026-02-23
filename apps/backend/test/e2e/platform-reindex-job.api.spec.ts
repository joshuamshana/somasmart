import { afterEach, describe, expect, it } from "vitest";
import { platformLogin, setupTestApp } from "../helpers";

describe("platform data reindex + jobs", () => {
  let app: Awaited<ReturnType<typeof setupTestApp>> | null = null;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
  });

  it("creates reindex job and exposes status from platform jobs endpoint", async () => {
    app = await setupTestApp();
    const { accessToken } = await platformLogin(app);

    const createProject = await app.inject({
      method: "POST",
      url: "/platform/projects",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { key: "jobscope", name: "Job Scope" }
    });
    expect(createProject.statusCode).toBe(201);
    const project = createProject.json() as { id: string };

    const missingAuditEnvelope = await app.inject({
      method: "POST",
      url: `/platform/projects/${project.id}/data/reindex`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { targets: ["users"] }
    });
    expect(missingAuditEnvelope.statusCode).toBe(400);
    expect((missingAuditEnvelope.json() as { code: string }).code).toBe("VALIDATION_FAILED");

    const createJob = await app.inject({
      method: "POST",
      url: `/platform/projects/${project.id}/data/reindex`,
      headers: { authorization: `Bearer ${accessToken}`, "x-trace-id": "trace_job_1" },
      payload: {
        reasonCode: "incident_recovery",
        ticketRef: "INC-1234",
        targets: ["users", "progress"]
      }
    });

    expect(createJob.statusCode).toBe(202);
    const queued = createJob.json() as { traceId: string; jobId: string };
    expect(queued.traceId).toBe("trace_job_1");
    expect(queued.jobId).toMatch(/^job_/);

    const jobRead = await app.inject({
      method: "GET",
      url: `/platform/jobs/${queued.jobId}`,
      headers: { authorization: `Bearer ${accessToken}` }
    });

    expect(jobRead.statusCode).toBe(200);
    const job = jobRead.json() as {
      id: string;
      kind: string;
      status: string;
      result?: { targets?: string[] };
    };

    expect(job.id).toBe(queued.jobId);
    expect(job.kind).toBe("data_reindex");
    expect(job.status).toBe("succeeded");
    expect(job.result?.targets).toEqual(["users", "progress"]);
  });
});
