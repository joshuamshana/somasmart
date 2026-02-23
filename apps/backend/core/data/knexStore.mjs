import knexFactory from "knex";
import { getBootstrapSeedConfig } from "../config/bootstrap.mjs";
import { hashSecret } from "../lib/crypto.mjs";
import { addDays, newId, nowIso } from "../lib/common.mjs";

function canonicalUsername(value) {
  return value.trim().toLowerCase();
}

function asIso(value) {
  return (value instanceof Date ? value : new Date(value)).toISOString();
}

function parseJsonRecord(value) {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
      return parsed;
    } catch {
      return {};
    }
  }
  if (typeof value !== "object" || Array.isArray(value)) return {};
  return value;
}

function withDatesToIso(row, dateKeys) {
  const next = { ...row };
  for (const key of dateKeys) {
    if (next[key] != null) next[key] = asIso(next[key]);
  }
  return next;
}

export class KnexStore {
  db;

  constructor(db) {
    this.db =
      db ??
      knexFactory({
        client: "pg",
        connection: process.env.DATABASE_URL,
      });
  }

  async ensureBootstrap() {
    const seed = getBootstrapSeedConfig();

    await this.db("Project")
      .insert({
        id: newId("prj"),
        key: seed.projectKey.trim().toLowerCase(),
        name: seed.projectName.trim(),
        status: "active",
      })
      .onConflict("key")
      .merge({
        name: seed.projectName.trim(),
        updatedAt: this.db.fn.now(),
      });

    const project = await this.db("Project")
      .where({ key: seed.projectKey.trim().toLowerCase() })
      .first();
    if (!project) {
      throw new Error("BOOTSTRAP_PROJECT_FAILED");
    }

    await this.db("TenantUser")
      .insert({
        id: newId("usr"),
        projectId: project.id,
        username: canonicalUsername(seed.tenantAdminUsername),
        displayName: `${project.name} Admin`,
        passwordHash: hashSecret(seed.tenantAdminPassword),
        role: "admin",
        status: "active",
      })
      .onConflict(["projectId", "username"])
      .merge({
        displayName: `${project.name} Admin`,
        passwordHash: hashSecret(seed.tenantAdminPassword),
        role: "admin",
        status: "active",
        deletedAt: null,
        updatedAt: this.db.fn.now(),
      });

    await this.db("PlatformAdminUser")
      .insert({
        id: newId("padm"),
        username: canonicalUsername(seed.platformAdminUsername),
        passwordHash: hashSecret(seed.platformAdminPassword),
      })
      .onConflict("username")
      .merge({
        passwordHash: hashSecret(seed.platformAdminPassword),
        updatedAt: this.db.fn.now(),
      });
  }

  async getProjectById(projectId) {
    const row = await this.db("Project").where({ id: projectId }).first();
    if (!row) return null;
    return withDatesToIso(row, ["createdAt", "updatedAt"]);
  }

  async getProjectByKey(projectKey) {
    const row = await this.db("Project")
      .where({ key: projectKey.trim().toLowerCase() })
      .first();
    if (!row) return null;
    return withDatesToIso(row, ["createdAt", "updatedAt"]);
  }

  async listProjects() {
    const rows = await this.db("Project").orderBy("key", "asc");
    return rows.map((row) => withDatesToIso(row, ["createdAt", "updatedAt"]));
  }

  async createProject(input) {
    const key = input.key.trim().toLowerCase();
    try {
      const row = {
        id: newId("prj"),
        key,
        name: input.name.trim(),
        status: "active",
      };
      await this.db("Project").insert(row);
      const created = await this.db("Project").where({ id: row.id }).first();
      return withDatesToIso(created, ["createdAt", "updatedAt"]);
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "23505") {
        throw new Error("PROJECT_KEY_EXISTS");
      }
      throw error;
    }
  }

  async updateProject(projectId, patch) {
    const current = await this.db("Project").where({ id: projectId }).first();
    if (!current) return null;

    await this.db("Project")
      .where({ id: projectId })
      .update({
        name: patch.name?.trim() || current.name,
        status: patch.status ?? current.status,
        updatedAt: patch.updatedAt ? new Date(patch.updatedAt) : this.db.fn.now(),
      });

    const row = await this.db("Project").where({ id: projectId }).first();
    return withDatesToIso(row, ["createdAt", "updatedAt"]);
  }

  async findPlatformAdminByUsername(username) {
    const row = await this.db("PlatformAdminUser")
      .where({ username: canonicalUsername(username) })
      .first();
    if (!row) return null;
    return withDatesToIso(row, ["createdAt", "updatedAt"]);
  }

  async findPlatformAdminById(adminId) {
    const row = await this.db("PlatformAdminUser").where({ id: adminId }).first();
    if (!row) return null;
    return withDatesToIso(row, ["createdAt", "updatedAt"]);
  }

  async createPlatformSession(input) {
    const row = {
      id: newId("psess"),
      platformAdminId: input.platformAdminId,
      refreshHash: input.refreshHash,
      expiresAt: new Date(input.expiresAt),
    };
    await this.db("PlatformSession").insert(row);
    const created = await this.db("PlatformSession").where({ id: row.id }).first();
    return withDatesToIso(created, ["expiresAt", "revokedAt", "createdAt", "updatedAt"]);
  }

  async findPlatformSessionById(sessionId) {
    const row = await this.db("PlatformSession").where({ id: sessionId }).first();
    if (!row) return null;
    return withDatesToIso(row, ["expiresAt", "revokedAt", "createdAt", "updatedAt"]);
  }

  async updatePlatformSession(sessionId, patch) {
    const current = await this.db("PlatformSession").where({ id: sessionId }).first();
    if (!current) return;

    await this.db("PlatformSession")
      .where({ id: sessionId })
      .update({
        refreshHash: patch.refreshHash ?? current.refreshHash,
        expiresAt: patch.expiresAt ? new Date(patch.expiresAt) : current.expiresAt,
        revokedAt:
          patch.revokedAt === undefined
            ? current.revokedAt
            : patch.revokedAt
              ? new Date(patch.revokedAt)
              : null,
        updatedAt: patch.updatedAt ? new Date(patch.updatedAt) : this.db.fn.now(),
      });
  }

  async findTenantUserByUsername(projectId, username) {
    const row = await this.db("TenantUser")
      .where({ projectId, username: canonicalUsername(username) })
      .first();
    if (!row) return null;
    return withDatesToIso(row, ["createdAt", "updatedAt", "deletedAt"]);
  }

  async findTenantUserById(projectId, userId) {
    const row = await this.db("TenantUser").where({ id: userId }).first();
    if (!row || row.projectId !== projectId) return null;
    return withDatesToIso(row, ["createdAt", "updatedAt", "deletedAt"]);
  }

  async createTenantUser(input) {
    const row = {
      id: newId("usr"),
      projectId: input.projectId,
      username: canonicalUsername(input.username),
      displayName: input.displayName.trim(),
      passwordHash: input.passwordHash,
      role: input.role,
      status: "active",
    };
    try {
      await this.db("TenantUser").insert(row);
      const created = await this.db("TenantUser").where({ id: row.id }).first();
      const result = withDatesToIso(created, ["createdAt", "updatedAt", "deletedAt"]);
      await this.applySyncEvent(input.projectId, {
        eventId: newId("seed_evt"),
        entityType: "users",
        entityId: result.id,
        op: "upsert",
        data: {
          id: result.id,
          projectId: result.projectId,
          username: result.username,
          displayName: result.displayName,
          role: result.role,
          status: result.status,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
        },
      });
      return result;
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "23505") {
        throw new Error("USERNAME_EXISTS");
      }
      throw error;
    }
  }

  async updateTenantUserStatus(projectId, userId, status) {
    const existing = await this.findTenantUserById(projectId, userId);
    if (!existing) return null;

    await this.db("TenantUser")
      .where({ id: userId })
      .update({
        status,
        updatedAt: this.db.fn.now(),
      });
    const row = await this.db("TenantUser").where({ id: userId }).first();
    const updated = withDatesToIso(row, ["createdAt", "updatedAt", "deletedAt"]);

    await this.applySyncEvent(projectId, {
      eventId: newId("evt"),
      entityType: "users",
      entityId: row.id,
      op: "upsert",
      data: { id: row.id, status: row.status, updatedAt: updated.updatedAt },
    });

    return updated;
  }

  async softDeleteTenantUser(projectId, userId) {
    const existing = await this.findTenantUserById(projectId, userId);
    if (!existing) return null;

    const deletedAt = nowIso();
    await this.db("TenantUser")
      .where({ id: userId })
      .update({
        deletedAt: new Date(deletedAt),
        updatedAt: this.db.fn.now(),
      });
    const row = await this.db("TenantUser").where({ id: userId }).first();
    const updated = withDatesToIso(row, ["createdAt", "updatedAt", "deletedAt"]);

    await this.applySyncEvent(projectId, {
      eventId: newId("evt"),
      entityType: "users",
      entityId: row.id,
      op: "delete",
      data: { deletedAt },
    });

    return updated;
  }

  async createTenantSession(input) {
    const row = {
      id: newId("tsess"),
      projectId: input.projectId,
      userId: input.userId,
      refreshHash: input.refreshHash,
      expiresAt: new Date(input.expiresAt),
      offlineTicketHash: input.offlineTicketHash ?? null,
      offlineTicketExpiresAt: input.offlineTicketExpiresAt ? new Date(input.offlineTicketExpiresAt) : null,
    };
    await this.db("TenantSession").insert(row);
    const created = await this.db("TenantSession").where({ id: row.id }).first();
    return withDatesToIso(created, ["expiresAt", "revokedAt", "offlineTicketExpiresAt", "createdAt", "updatedAt"]);
  }

  async findTenantSessionById(sessionId) {
    const row = await this.db("TenantSession").where({ id: sessionId }).first();
    if (!row) return null;
    return withDatesToIso(row, ["expiresAt", "revokedAt", "offlineTicketExpiresAt", "createdAt", "updatedAt"]);
  }

  async updateTenantSession(sessionId, patch) {
    const current = await this.db("TenantSession").where({ id: sessionId }).first();
    if (!current) return;

    await this.db("TenantSession")
      .where({ id: sessionId })
      .update({
        refreshHash: patch.refreshHash ?? current.refreshHash,
        expiresAt: patch.expiresAt ? new Date(patch.expiresAt) : current.expiresAt,
        revokedAt:
          patch.revokedAt === undefined
            ? current.revokedAt
            : patch.revokedAt
              ? new Date(patch.revokedAt)
              : null,
        offlineTicketHash: patch.offlineTicketHash ?? current.offlineTicketHash,
        offlineTicketExpiresAt:
          patch.offlineTicketExpiresAt === undefined
            ? current.offlineTicketExpiresAt
            : patch.offlineTicketExpiresAt
              ? new Date(patch.offlineTicketExpiresAt)
              : null,
        updatedAt: patch.updatedAt ? new Date(patch.updatedAt) : this.db.fn.now(),
      });
  }

  async hasProcessedBatch(projectId, deviceId, batchId) {
    const row = await this.db("SyncBatch")
      .where({ projectId, deviceId, batchId })
      .select("id")
      .first();
    return Boolean(row);
  }

  async markProcessedBatch(projectId, deviceId, batchId) {
    await this.db("SyncBatch")
      .insert({
        id: newId("bat"),
        projectId,
        deviceId,
        batchId,
      })
      .onConflict(["projectId", "deviceId", "batchId"])
      .ignore();
  }

  async hasProcessedEvent(projectId, eventId) {
    const row = await this.db("SyncEvent")
      .where({ projectId, eventId })
      .select("id")
      .first();
    return Boolean(row);
  }

  async markProcessedEvent(projectId, eventId) {
    await this.db("SyncEvent")
      .insert({
        id: newId("evt"),
        projectId,
        eventId,
      })
      .onConflict(["projectId", "eventId"])
      .ignore();
  }

  async applySyncEvent(projectId, event) {
    const occurredAt = event.occurredAt ?? nowIso();
    return this.db.transaction(async (tx) => {
      const existing = await tx("SyncRecord")
        .where({
          projectId,
          entityType: event.entityType,
          entityId: event.entityId,
        })
        .first();

      const mergedData =
        event.op === "delete"
          ? parseJsonRecord(existing?.value)
          : {
              ...parseJsonRecord(existing?.value),
              ...(event.data ?? {}),
            };

      await tx("SyncRecord")
        .insert({
          id: newId("rec"),
          projectId,
          entityType: event.entityType,
          entityId: event.entityId,
          value: mergedData,
          updatedAt: new Date(occurredAt),
          deletedAt: event.op === "delete" ? new Date(occurredAt) : null,
        })
        .onConflict(["projectId", "entityType", "entityId"])
        .merge({
          value: mergedData,
          updatedAt: new Date(occurredAt),
          deletedAt: event.op === "delete" ? new Date(occurredAt) : null,
        });

      const latest = await tx("ChangeLog").where({ projectId }).max({ maxSeq: "seq" }).first();
      const seq = Number(latest?.maxSeq ?? 0) + 1;

      const row = {
        id: newId("chg"),
        projectId,
        seq,
        entityType: event.entityType,
        entityId: event.entityId,
        op: event.op,
        data: event.data ?? null,
        occurredAt: new Date(occurredAt),
      };
      await tx("ChangeLog").insert(row);
      return {
        ...row,
        data: row.data ? parseJsonRecord(row.data) : undefined,
        occurredAt: asIso(row.occurredAt),
      };
    });
  }

  async pullChanges(projectId, sinceCursor, limit) {
    const rows = await this.db("ChangeLog")
      .where({ projectId })
      .andWhere("seq", ">", sinceCursor)
      .orderBy("seq", "asc")
      .limit(limit);

    return rows.map((row) => ({
      ...row,
      data: row.data ? parseJsonRecord(row.data) : undefined,
      occurredAt: asIso(row.occurredAt),
    }));
  }

  async getLastCursor(projectId) {
    const result = await this.db("ChangeLog").where({ projectId }).max({ maxSeq: "seq" }).first();
    return Number(result?.maxSeq ?? 0);
  }

  async getCheckpoint(input) {
    const row = await this.db("DeviceCheckpoint")
      .where({
        projectId: input.projectId,
        userId: input.userId,
        deviceId: input.deviceId,
        scope: input.scope,
      })
      .first();
    return row?.cursor ?? 0;
  }

  async setCheckpoint(input) {
    await this.db("DeviceCheckpoint")
      .insert({
        id: newId("chk"),
        projectId: input.projectId,
        userId: input.userId,
        deviceId: input.deviceId,
        scope: input.scope,
        cursor: input.cursor,
      })
      .onConflict(["projectId", "userId", "deviceId", "scope"])
      .merge({
        cursor: input.cursor,
        updatedAt: this.db.fn.now(),
      });
  }

  async upsertBlobManifest(input) {
    const bytes =
      input.bytes == null ? null : Buffer.isBuffer(input.bytes) ? input.bytes : Buffer.from(input.bytes);
    await this.db("BlobManifest")
      .insert({
        id: newId("blob"),
        projectId: input.projectId,
        cid: input.cid,
        mime: input.mime,
        size: input.size,
        bytes,
        createdAt: input.createdAt ? new Date(input.createdAt) : this.db.fn.now(),
      })
      .onConflict(["projectId", "cid"])
      .merge({
        mime: input.mime,
        size: input.size,
        bytes,
      });
  }

  async getBlobManifest(projectId, cid) {
    const row = await this.db("BlobManifest").where({ projectId, cid }).first();
    if (!row) return null;
    return {
      ...row,
      bytes: row.bytes ? Buffer.from(row.bytes) : undefined,
      createdAt: asIso(row.createdAt),
    };
  }

  async listMissingBlobs(projectId, cids) {
    if (!cids.length) return [];
    const rows = await this.db("BlobManifest").where({ projectId }).whereIn("cid", cids).select("cid");
    const found = new Set(rows.map((row) => row.cid));
    return cids.filter((cid) => !found.has(cid));
  }

  async exportProjectData(projectId, entityTypes) {
    const project = await this.getProjectById(projectId);
    if (!project) return null;

    const usersRows = await this.db("TenantUser").where({ projectId });
    const recordsQuery = this.db("SyncRecord").where({ projectId });
    const changesQuery = this.db("ChangeLog").where({ projectId }).orderBy("seq", "asc");

    if (entityTypes?.length) {
      recordsQuery.whereIn("entityType", entityTypes);
      changesQuery.whereIn("entityType", entityTypes);
    }

    const [recordsRows, changesRows] = await Promise.all([recordsQuery, changesQuery]);

    return {
      project,
      users: usersRows.map((row) => withDatesToIso(row, ["createdAt", "updatedAt", "deletedAt"])),
      records: recordsRows.map((row) => ({
        entityType: row.entityType,
        entityId: row.entityId,
        value: parseJsonRecord(row.value),
        updatedAt: asIso(row.updatedAt),
        deletedAt: row.deletedAt ? asIso(row.deletedAt) : undefined,
      })),
      changes: changesRows.map((row) => ({
        ...row,
        data: row.data ? parseJsonRecord(row.data) : undefined,
        occurredAt: asIso(row.occurredAt),
      })),
    };
  }

  async applyDataMutations(projectId, ops) {
    const result = { applied: [], rejected: [] };
    for (const [index, op] of ops.entries()) {
      if (op.type === "tenant.user.status.set") {
        const updated = await this.updateTenantUserStatus(projectId, op.userId, op.status);
        if (!updated) {
          result.rejected.push({
            index,
            type: op.type,
            code: "NOT_FOUND",
            message: "User not found in project.",
          });
          continue;
        }
        result.applied.push({ index, type: op.type, target: updated.id });
        continue;
      }

      if (op.type === "tenant.user.soft_delete") {
        const deleted = await this.softDeleteTenantUser(projectId, op.userId);
        if (!deleted) {
          result.rejected.push({
            index,
            type: op.type,
            code: "NOT_FOUND",
            message: "User not found in project.",
          });
          continue;
        }
        result.applied.push({ index, type: op.type, target: deleted.id });
        continue;
      }

      if (op.type === "tenant.record.upsert") {
        await this.applySyncEvent(projectId, {
          eventId: newId("pmut"),
          entityType: op.entityType,
          entityId: op.entityId,
          op: "upsert",
          data: op.data,
        });
        result.applied.push({ index, type: op.type, target: `${op.entityType}:${op.entityId}` });
        continue;
      }

      result.rejected.push({ index, type: "unknown", code: "INVALID_OP", message: "Unsupported mutation type." });
    }
    return result;
  }

  async createPlatformJob(input) {
    const row = {
      id: newId("job"),
      projectId: input.projectId,
      kind: input.kind,
      status: "queued",
      payload: input.payload ?? null,
    };
    await this.db("PlatformJob").insert(row);
    const created = await this.db("PlatformJob").where({ id: row.id }).first();
    return {
      ...created,
      payload: created.payload ? parseJsonRecord(created.payload) : undefined,
      result: created.result ? parseJsonRecord(created.result) : undefined,
      createdAt: asIso(created.createdAt),
      updatedAt: asIso(created.updatedAt),
    };
  }

  async findPlatformJobById(jobId) {
    const row = await this.db("PlatformJob").where({ id: jobId }).first();
    if (!row) return null;
    return {
      ...row,
      payload: row.payload ? parseJsonRecord(row.payload) : undefined,
      result: row.result ? parseJsonRecord(row.result) : undefined,
      createdAt: asIso(row.createdAt),
      updatedAt: asIso(row.updatedAt),
    };
  }

  async updatePlatformJob(jobId, patch) {
    const current = await this.db("PlatformJob").where({ id: jobId }).first();
    if (!current) return;

    const updateData = {
      status: patch.status ?? current.status,
      updatedAt: patch.updatedAt ? new Date(patch.updatedAt) : this.db.fn.now(),
    };
    if (patch.result) updateData.result = patch.result;

    await this.db("PlatformJob").where({ id: jobId }).update(updateData);
  }

  async appendPlatformAudit(entry) {
    const row = {
      id: newId("audit"),
      actorAdminId: entry.actorAdminId,
      projectId: entry.projectId ?? null,
      action: entry.action,
      reasonCode: entry.reasonCode ?? null,
      ticketRef: entry.ticketRef ?? null,
      traceId: entry.traceId,
      beforeState: entry.beforeState ?? null,
      afterState: entry.afterState ?? null,
    };
    await this.db("PlatformAuditLog").insert(row);
    const created = await this.db("PlatformAuditLog").where({ id: row.id }).first();
    return {
      ...created,
      projectId: created.projectId ?? undefined,
      reasonCode: created.reasonCode ?? undefined,
      ticketRef: created.ticketRef ?? undefined,
      beforeState: created.beforeState ? parseJsonRecord(created.beforeState) : undefined,
      afterState: created.afterState ? parseJsonRecord(created.afterState) : undefined,
      createdAt: asIso(created.createdAt),
    };
  }

  async listPlatformAudits(projectId) {
    const query = this.db("PlatformAuditLog").orderBy("createdAt", "asc");
    if (projectId) query.where({ projectId });
    const rows = await query;
    return rows.map((row) => ({
      ...row,
      projectId: row.projectId ?? undefined,
      reasonCode: row.reasonCode ?? undefined,
      ticketRef: row.ticketRef ?? undefined,
      beforeState: row.beforeState ? parseJsonRecord(row.beforeState) : undefined,
      afterState: row.afterState ? parseJsonRecord(row.afterState) : undefined,
      createdAt: asIso(row.createdAt),
    }));
  }

  async createOfflineTicketForTenantSession(sessionId) {
    const session = await this.db("TenantSession").where({ id: sessionId }).first();
    if (!session) return null;
    const ticket = newId("offtk");
    await this.updateTenantSession(sessionId, {
      offlineTicketHash: hashSecret(ticket),
      offlineTicketExpiresAt: addDays(30),
    });
    return ticket;
  }

  async checkReadiness() {
    try {
      await this.db.raw("SELECT 1");
      return {
        ready: true,
        store: "knex",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "DB readiness check failed";
      return {
        ready: false,
        store: "knex",
        message,
      };
    }
  }
}

