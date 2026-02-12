import type { FastifyInstance } from "fastify";
import { platformProjectCreateSchema, platformProjectPatchSchema } from "../contracts";
import { getTraceId, requirePlatformAccess } from "./helpers";

export async function registerPlatformProjectRoutes(app: FastifyInstance) {
  app.post("/platform/projects", async (request, reply) => {
    let claims;
    try {
      claims = await requirePlatformAccess(request);
    } catch {
      return reply.status(403).send({ code: "FORBIDDEN_PLATFORM_ONLY" });
    }

    const parsed = platformProjectCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ code: "VALIDATION_FAILED", issues: parsed.error.issues });
    }

    try {
      const created = await app.store.createProject(parsed.data);
      await app.store.appendPlatformAudit({
        actorAdminId: claims.sub,
        projectId: created.id,
        action: "project_create",
        traceId: getTraceId(request),
        afterState: { key: created.key, name: created.name, status: created.status }
      });
      return reply.status(201).send(created);
    } catch (error) {
      if (error instanceof Error && error.message === "PROJECT_KEY_EXISTS") {
        return reply.status(409).send({ code: "PROJECT_KEY_EXISTS" });
      }
      throw error;
    }
  });

  app.get("/platform/projects", async (request, reply) => {
    try {
      await requirePlatformAccess(request);
    } catch {
      return reply.status(403).send({ code: "FORBIDDEN_PLATFORM_ONLY" });
    }

    const projects = await app.store.listProjects();
    return reply.send({ projects });
  });

  app.patch("/platform/projects/:projectId", async (request, reply) => {
    let claims;
    try {
      claims = await requirePlatformAccess(request);
    } catch {
      return reply.status(403).send({ code: "FORBIDDEN_PLATFORM_ONLY" });
    }

    const params = request.params as { projectId?: string };
    if (!params.projectId) return reply.status(400).send({ code: "PROJECT_ID_REQUIRED" });

    const parsed = platformProjectPatchSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ code: "VALIDATION_FAILED", issues: parsed.error.issues });
    }

    const before = await app.store.getProjectById(params.projectId);
    if (!before) return reply.status(404).send({ code: "PROJECT_NOT_FOUND" });

    const updated = await app.store.updateProject(params.projectId, parsed.data);
    if (!updated) return reply.status(404).send({ code: "PROJECT_NOT_FOUND" });

    await app.store.appendPlatformAudit({
      actorAdminId: claims.sub,
      projectId: updated.id,
      action: "project_update",
      traceId: getTraceId(request),
      beforeState: before,
      afterState: updated
    });

    return reply.send(updated);
  });

  app.post("/platform/projects/:projectId/suspend", async (request, reply) => {
    let claims;
    try {
      claims = await requirePlatformAccess(request);
    } catch {
      return reply.status(403).send({ code: "FORBIDDEN_PLATFORM_ONLY" });
    }

    const params = request.params as { projectId?: string };
    if (!params.projectId) return reply.status(400).send({ code: "PROJECT_ID_REQUIRED" });

    const before = await app.store.getProjectById(params.projectId);
    if (!before) return reply.status(404).send({ code: "PROJECT_NOT_FOUND" });

    const updated = await app.store.updateProject(params.projectId, { status: "suspended" });
    if (!updated) return reply.status(404).send({ code: "PROJECT_NOT_FOUND" });

    await app.store.appendPlatformAudit({
      actorAdminId: claims.sub,
      projectId: updated.id,
      action: "project_suspend",
      traceId: getTraceId(request),
      beforeState: before,
      afterState: updated
    });

    return reply.send(updated);
  });

  app.post("/platform/projects/:projectId/activate", async (request, reply) => {
    let claims;
    try {
      claims = await requirePlatformAccess(request);
    } catch {
      return reply.status(403).send({ code: "FORBIDDEN_PLATFORM_ONLY" });
    }

    const params = request.params as { projectId?: string };
    if (!params.projectId) return reply.status(400).send({ code: "PROJECT_ID_REQUIRED" });

    const before = await app.store.getProjectById(params.projectId);
    if (!before) return reply.status(404).send({ code: "PROJECT_NOT_FOUND" });

    const updated = await app.store.updateProject(params.projectId, { status: "active" });
    if (!updated) return reply.status(404).send({ code: "PROJECT_NOT_FOUND" });

    await app.store.appendPlatformAudit({
      actorAdminId: claims.sub,
      projectId: updated.id,
      action: "project_activate",
      traceId: getTraceId(request),
      beforeState: before,
      afterState: updated
    });

    return reply.send(updated);
  });
}
