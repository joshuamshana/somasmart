import type { FastifyInstance } from "fastify";
import { blobNeedSchema, syncPullSchema, syncPushSchema } from "../contracts";
import { requireTenantAccess } from "./helpers";
import type { ChangeLogEntry } from "../types";

function canReadChangeForRole(change: ChangeLogEntry, userId: string, role: string) {
  if (role === "admin" || role === "school_admin") return true;
  if (change.entityType !== "users") return true;
  return change.entityId === userId;
}

export async function registerTenantSyncRoutes(app: FastifyInstance) {
  app.post("/sync/push", async (request, reply) => {
    let claims;
    try {
      claims = await requireTenantAccess(request);
    } catch {
      return reply.status(403).send({ code: "FORBIDDEN_TENANT_ONLY" });
    }

    const parsed = syncPushSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ code: "VALIDATION_FAILED", issues: parsed.error.issues });
    }

    const { deviceId, batchId, events } = parsed.data;

    const replayed = await app.store.hasProcessedBatch(claims.projectId, deviceId, batchId);
    if (replayed) {
      const cursor = await app.store.getLastCursor(claims.projectId);
      return reply.send({
        replayed: true,
        accepted: [],
        rejected: [],
        serverWatermark: cursor
      });
    }

    const accepted: string[] = [];
    const rejected: Array<{ eventId: string; code: string; message: string }> = [];

    for (const event of events) {
      const seen = await app.store.hasProcessedEvent(claims.projectId, event.eventId);
      if (seen) {
        rejected.push({ eventId: event.eventId, code: "IDEMPOTENT_REPLAY", message: "Event already processed." });
        continue;
      }
      await app.store.applySyncEvent(claims.projectId, event);
      await app.store.markProcessedEvent(claims.projectId, event.eventId);
      accepted.push(event.eventId);
    }

    await app.store.markProcessedBatch(claims.projectId, deviceId, batchId);
    const serverWatermark = await app.store.getLastCursor(claims.projectId);

    return reply.send({
      replayed: false,
      accepted,
      rejected,
      serverWatermark
    });
  });

  app.post("/sync/pull", async (request, reply) => {
    let claims;
    try {
      claims = await requireTenantAccess(request);
    } catch {
      return reply.status(403).send({ code: "FORBIDDEN_TENANT_ONLY" });
    }

    const parsed = syncPullSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ code: "VALIDATION_FAILED", issues: parsed.error.issues });
    }

    const { deviceId, checkpoints } = parsed.data;
    const scope = "default";
    const explicitCursor = checkpoints[scope];
    const since =
      typeof explicitCursor === "number"
        ? explicitCursor
        : await app.store.getCheckpoint({
            projectId: claims.projectId,
            userId: claims.sub,
            deviceId,
            scope
          });

    const pulled = await app.store.pullChanges(claims.projectId, since, 500);
    const filtered = pulled.filter((entry) => canReadChangeForRole(entry, claims.sub, claims.role));
    const nextCursor = filtered.length ? filtered[filtered.length - 1].seq : since;

    await app.store.setCheckpoint({
      projectId: claims.projectId,
      userId: claims.sub,
      deviceId,
      scope,
      cursor: nextCursor
    });

    return reply.send({
      scope,
      changes: filtered,
      nextCheckpoints: {
        [scope]: nextCursor
      }
    });
  });

  app.post("/sync/blobs/need", async (request, reply) => {
    let claims;
    try {
      claims = await requireTenantAccess(request);
    } catch {
      return reply.status(403).send({ code: "FORBIDDEN_TENANT_ONLY" });
    }

    const parsed = blobNeedSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ code: "VALIDATION_FAILED", issues: parsed.error.issues });
    }

    const missing = await app.store.listMissingBlobs(claims.projectId, parsed.data.cids);
    return reply.send({ missing });
  });

  app.get("/sync/blob/:cid", async (request, reply) => {
    let claims;
    try {
      claims = await requireTenantAccess(request);
    } catch {
      return reply.status(403).send({ code: "FORBIDDEN_TENANT_ONLY" });
    }

    const params = request.params as { cid?: string };
    if (!params.cid) return reply.status(400).send({ code: "CID_REQUIRED" });

    const manifest = await app.store.getBlobManifest(claims.projectId, params.cid);
    if (!manifest) return reply.status(404).send({ code: "BLOB_NOT_FOUND" });

    reply.header("content-type", manifest.mime);
    reply.header("x-blob-cid", manifest.cid);
    reply.header("x-blob-size", String(manifest.size));
    return reply.send(manifest.bytes ?? Buffer.alloc(0));
  });
}
