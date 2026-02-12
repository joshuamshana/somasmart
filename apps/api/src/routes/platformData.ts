import type { FastifyInstance } from "fastify";
import {
  platformDataExportSchema,
  platformDataMutationsSchema,
  platformDataReindexSchema
} from "../contracts";
import { getTraceId, requirePlatformAccess } from "./helpers";

export async function registerPlatformDataRoutes(app: FastifyInstance) {
  app.post("/platform/projects/:projectId/data/export", async (request, reply) => {
    let claims;
    try {
      claims = await requirePlatformAccess(request);
    } catch {
      return reply.status(403).send({ code: "FORBIDDEN_PLATFORM_ONLY" });
    }

    const params = request.params as { projectId?: string };
    if (!params.projectId) return reply.status(400).send({ code: "PROJECT_ID_REQUIRED" });

    const parsed = platformDataExportSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ code: "VALIDATION_FAILED", issues: parsed.error.issues });
    }

    const exported = await app.store.exportProjectData(params.projectId, parsed.data.entityTypes);
    if (!exported) return reply.status(404).send({ code: "PROJECT_NOT_FOUND" });

    const traceId = getTraceId(request);
    await app.store.appendPlatformAudit({
      actorAdminId: claims.sub,
      projectId: params.projectId,
      action: "data_export",
      reasonCode: parsed.data.reasonCode,
      ticketRef: parsed.data.ticketRef,
      traceId,
      afterState: {
        entityTypes: parsed.data.entityTypes,
        userCount: exported.users.length,
        recordCount: exported.records.length,
        changeCount: exported.changes.length
      }
    });

    return reply.send({
      traceId,
      generatedAt: new Date().toISOString(),
      project: exported.project,
      users: exported.users,
      records: exported.records,
      changes: exported.changes
    });
  });

  app.post("/platform/projects/:projectId/data/mutations", async (request, reply) => {
    let claims;
    try {
      claims = await requirePlatformAccess(request);
    } catch {
      return reply.status(403).send({ code: "FORBIDDEN_PLATFORM_ONLY" });
    }

    const params = request.params as { projectId?: string };
    if (!params.projectId) return reply.status(400).send({ code: "PROJECT_ID_REQUIRED" });

    const parsed = platformDataMutationsSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ code: "VALIDATION_FAILED", issues: parsed.error.issues });
    }

    const project = await app.store.getProjectById(params.projectId);
    if (!project) return reply.status(404).send({ code: "PROJECT_NOT_FOUND" });

    const traceId = getTraceId(request);
    const result = await app.store.applyDataMutations(params.projectId, parsed.data.ops);

    await app.store.appendPlatformAudit({
      actorAdminId: claims.sub,
      projectId: params.projectId,
      action: "data_mutation",
      reasonCode: parsed.data.reasonCode,
      ticketRef: parsed.data.ticketRef,
      traceId,
      afterState: {
        applied: result.applied.length,
        rejected: result.rejected.length
      }
    });

    return reply.send({ traceId, result });
  });

  app.post("/platform/projects/:projectId/data/reindex", async (request, reply) => {
    let claims;
    try {
      claims = await requirePlatformAccess(request);
    } catch {
      return reply.status(403).send({ code: "FORBIDDEN_PLATFORM_ONLY" });
    }

    const params = request.params as { projectId?: string };
    if (!params.projectId) return reply.status(400).send({ code: "PROJECT_ID_REQUIRED" });

    const parsed = platformDataReindexSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ code: "VALIDATION_FAILED", issues: parsed.error.issues });
    }

    const project = await app.store.getProjectById(params.projectId);
    if (!project) return reply.status(404).send({ code: "PROJECT_NOT_FOUND" });

    const job = await app.store.createPlatformJob({
      projectId: params.projectId,
      kind: "data_reindex",
      payload: { targets: parsed.data.targets }
    });
    await app.store.updatePlatformJob(job.id, {
      status: "succeeded",
      result: {
        targets: parsed.data.targets ?? ["all"],
        indexedAt: new Date().toISOString()
      }
    });

    const traceId = getTraceId(request);
    await app.store.appendPlatformAudit({
      actorAdminId: claims.sub,
      projectId: params.projectId,
      action: "data_reindex",
      reasonCode: parsed.data.reasonCode,
      ticketRef: parsed.data.ticketRef,
      traceId,
      afterState: { jobId: job.id }
    });

    return reply.status(202).send({ traceId, jobId: job.id });
  });

  app.get("/platform/jobs/:jobId", async (request, reply) => {
    try {
      await requirePlatformAccess(request);
    } catch {
      return reply.status(403).send({ code: "FORBIDDEN_PLATFORM_ONLY" });
    }

    const params = request.params as { jobId?: string };
    if (!params.jobId) return reply.status(400).send({ code: "JOB_ID_REQUIRED" });

    const job = await app.store.findPlatformJobById(params.jobId);
    if (!job) return reply.status(404).send({ code: "JOB_NOT_FOUND" });

    return reply.send(job);
  });
}
