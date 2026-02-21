import { PrismaClient } from "@prisma/client";
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
    if (!value || typeof value !== "object" || Array.isArray(value))
        return {};
    return value;
}
function toInputJson(value) {
    return value;
}
export class PrismaStore {
    prisma;
    constructor(prisma) {
        this.prisma = prisma ?? new PrismaClient();
    }
    async ensureBootstrap() {
        const seed = getBootstrapSeedConfig();
        const project = await this.prisma.project.upsert({
            where: { key: seed.projectKey },
            update: { name: seed.projectName },
            create: { key: seed.projectKey, name: seed.projectName, status: "active" }
        });
        await this.prisma.tenantUser.upsert({
            where: {
                projectId_username: {
                    projectId: project.id,
                    username: canonicalUsername(seed.tenantAdminUsername)
                }
            },
            update: {
                displayName: `${project.name} Admin`,
                passwordHash: hashSecret(seed.tenantAdminPassword),
                role: "admin",
                status: "active",
                deletedAt: null
            },
            create: {
                id: newId("usr"),
                projectId: project.id,
                username: canonicalUsername(seed.tenantAdminUsername),
                displayName: `${project.name} Admin`,
                passwordHash: hashSecret(seed.tenantAdminPassword),
                role: "admin",
                status: "active"
            }
        });
        await this.prisma.platformAdminUser.upsert({
            where: { username: canonicalUsername(seed.platformAdminUsername) },
            update: {
                passwordHash: hashSecret(seed.platformAdminPassword)
            },
            create: {
                id: newId("padm"),
                username: canonicalUsername(seed.platformAdminUsername),
                passwordHash: hashSecret(seed.platformAdminPassword)
            }
        });
    }
    async getProjectById(projectId) {
        const row = await this.prisma.project.findUnique({ where: { id: projectId } });
        if (!row)
            return null;
        return {
            id: row.id,
            key: row.key,
            name: row.name,
            status: row.status,
            createdAt: asIso(row.createdAt),
            updatedAt: asIso(row.updatedAt)
        };
    }
    async getProjectByKey(projectKey) {
        const row = await this.prisma.project.findUnique({ where: { key: projectKey.trim().toLowerCase() } });
        if (!row)
            return null;
        return {
            id: row.id,
            key: row.key,
            name: row.name,
            status: row.status,
            createdAt: asIso(row.createdAt),
            updatedAt: asIso(row.updatedAt)
        };
    }
    async listProjects() {
        const rows = await this.prisma.project.findMany({ orderBy: { key: "asc" } });
        return rows.map((row) => ({
            id: row.id,
            key: row.key,
            name: row.name,
            status: row.status,
            createdAt: asIso(row.createdAt),
            updatedAt: asIso(row.updatedAt)
        }));
    }
    async createProject(input) {
        const key = input.key.trim().toLowerCase();
        try {
            const row = await this.prisma.project.create({
                data: { id: newId("prj"), key, name: input.name.trim(), status: "active" }
            });
            return {
                id: row.id,
                key: row.key,
                name: row.name,
                status: row.status,
                createdAt: asIso(row.createdAt),
                updatedAt: asIso(row.updatedAt)
            };
        }
        catch {
            throw new Error("PROJECT_KEY_EXISTS");
        }
    }
    async updateProject(projectId, patch) {
        const current = await this.prisma.project.findUnique({ where: { id: projectId } });
        if (!current)
            return null;
        const row = await this.prisma.project.update({
            where: { id: projectId },
            data: {
                name: patch.name?.trim() || current.name,
                status: patch.status ?? current.status
            }
        });
        return {
            id: row.id,
            key: row.key,
            name: row.name,
            status: row.status,
            createdAt: asIso(row.createdAt),
            updatedAt: asIso(row.updatedAt)
        };
    }
    async findPlatformAdminByUsername(username) {
        const row = await this.prisma.platformAdminUser.findUnique({
            where: { username: canonicalUsername(username) }
        });
        if (!row)
            return null;
        return {
            id: row.id,
            username: row.username,
            passwordHash: row.passwordHash,
            createdAt: asIso(row.createdAt),
            updatedAt: asIso(row.updatedAt)
        };
    }
    async findPlatformAdminById(adminId) {
        const row = await this.prisma.platformAdminUser.findUnique({ where: { id: adminId } });
        if (!row)
            return null;
        return {
            id: row.id,
            username: row.username,
            passwordHash: row.passwordHash,
            createdAt: asIso(row.createdAt),
            updatedAt: asIso(row.updatedAt)
        };
    }
    async createPlatformSession(input) {
        const row = await this.prisma.platformSession.create({
            data: {
                id: newId("psess"),
                platformAdminId: input.platformAdminId,
                refreshHash: input.refreshHash,
                expiresAt: new Date(input.expiresAt)
            }
        });
        return {
            id: row.id,
            platformAdminId: row.platformAdminId,
            refreshHash: row.refreshHash,
            expiresAt: asIso(row.expiresAt),
            revokedAt: row.revokedAt ? asIso(row.revokedAt) : undefined,
            createdAt: asIso(row.createdAt),
            updatedAt: asIso(row.updatedAt)
        };
    }
    async findPlatformSessionById(sessionId) {
        const row = await this.prisma.platformSession.findUnique({ where: { id: sessionId } });
        if (!row)
            return null;
        return {
            id: row.id,
            platformAdminId: row.platformAdminId,
            refreshHash: row.refreshHash,
            expiresAt: asIso(row.expiresAt),
            revokedAt: row.revokedAt ? asIso(row.revokedAt) : undefined,
            createdAt: asIso(row.createdAt),
            updatedAt: asIso(row.updatedAt)
        };
    }
    async updatePlatformSession(sessionId, patch) {
        const current = await this.prisma.platformSession.findUnique({ where: { id: sessionId } });
        if (!current)
            return;
        await this.prisma.platformSession.update({
            where: { id: sessionId },
            data: {
                refreshHash: patch.refreshHash ?? current.refreshHash,
                expiresAt: patch.expiresAt ? new Date(patch.expiresAt) : current.expiresAt,
                revokedAt: patch.revokedAt ? new Date(patch.revokedAt) : patch.revokedAt === undefined ? current.revokedAt : null,
                updatedAt: patch.updatedAt ? new Date(patch.updatedAt) : new Date()
            }
        });
    }
    async findTenantUserByUsername(projectId, username) {
        const row = await this.prisma.tenantUser.findUnique({
            where: {
                projectId_username: {
                    projectId,
                    username: canonicalUsername(username)
                }
            }
        });
        if (!row)
            return null;
        return {
            id: row.id,
            projectId: row.projectId,
            username: row.username,
            displayName: row.displayName,
            passwordHash: row.passwordHash,
            role: row.role,
            status: row.status,
            createdAt: asIso(row.createdAt),
            updatedAt: asIso(row.updatedAt),
            deletedAt: row.deletedAt ? asIso(row.deletedAt) : undefined
        };
    }
    async findTenantUserById(projectId, userId) {
        const row = await this.prisma.tenantUser.findUnique({ where: { id: userId } });
        if (!row || row.projectId !== projectId)
            return null;
        return {
            id: row.id,
            projectId: row.projectId,
            username: row.username,
            displayName: row.displayName,
            passwordHash: row.passwordHash,
            role: row.role,
            status: row.status,
            createdAt: asIso(row.createdAt),
            updatedAt: asIso(row.updatedAt),
            deletedAt: row.deletedAt ? asIso(row.deletedAt) : undefined
        };
    }
    async createTenantUser(input) {
        try {
            const row = await this.prisma.tenantUser.create({
                data: {
                    id: newId("usr"),
                    projectId: input.projectId,
                    username: canonicalUsername(input.username),
                    displayName: input.displayName.trim(),
                    passwordHash: input.passwordHash,
                    role: input.role,
                    status: "active"
                }
            });
            await this.applySyncEvent(input.projectId, {
                eventId: newId("seed_evt"),
                entityType: "users",
                entityId: row.id,
                op: "upsert",
                data: {
                    id: row.id,
                    projectId: row.projectId,
                    username: row.username,
                    displayName: row.displayName,
                    role: row.role,
                    status: row.status,
                    createdAt: asIso(row.createdAt),
                    updatedAt: asIso(row.updatedAt)
                }
            });
            return {
                id: row.id,
                projectId: row.projectId,
                username: row.username,
                displayName: row.displayName,
                passwordHash: row.passwordHash,
                role: row.role,
                status: row.status,
                createdAt: asIso(row.createdAt),
                updatedAt: asIso(row.updatedAt)
            };
        }
        catch {
            throw new Error("USERNAME_EXISTS");
        }
    }
    async updateTenantUserStatus(projectId, userId, status) {
        const existing = await this.findTenantUserById(projectId, userId);
        if (!existing)
            return null;
        const row = await this.prisma.tenantUser.update({
            where: { id: userId },
            data: { status }
        });
        const updatedAt = asIso(row.updatedAt);
        await this.applySyncEvent(projectId, {
            eventId: newId("evt"),
            entityType: "users",
            entityId: row.id,
            op: "upsert",
            data: { id: row.id, status: row.status, updatedAt }
        });
        return {
            id: row.id,
            projectId: row.projectId,
            username: row.username,
            displayName: row.displayName,
            passwordHash: row.passwordHash,
            role: row.role,
            status: row.status,
            createdAt: asIso(row.createdAt),
            updatedAt,
            deletedAt: row.deletedAt ? asIso(row.deletedAt) : undefined
        };
    }
    async softDeleteTenantUser(projectId, userId) {
        const existing = await this.findTenantUserById(projectId, userId);
        if (!existing)
            return null;
        const deletedAt = nowIso();
        const row = await this.prisma.tenantUser.update({
            where: { id: userId },
            data: { deletedAt: new Date(deletedAt) }
        });
        await this.applySyncEvent(projectId, {
            eventId: newId("evt"),
            entityType: "users",
            entityId: row.id,
            op: "delete",
            data: { deletedAt }
        });
        return {
            id: row.id,
            projectId: row.projectId,
            username: row.username,
            displayName: row.displayName,
            passwordHash: row.passwordHash,
            role: row.role,
            status: row.status,
            createdAt: asIso(row.createdAt),
            updatedAt: asIso(row.updatedAt),
            deletedAt: row.deletedAt ? asIso(row.deletedAt) : undefined
        };
    }
    async createTenantSession(input) {
        const row = await this.prisma.tenantSession.create({
            data: {
                id: newId("tsess"),
                projectId: input.projectId,
                userId: input.userId,
                refreshHash: input.refreshHash,
                expiresAt: new Date(input.expiresAt),
                offlineTicketHash: input.offlineTicketHash,
                offlineTicketExpiresAt: input.offlineTicketExpiresAt ? new Date(input.offlineTicketExpiresAt) : null
            }
        });
        return {
            id: row.id,
            projectId: row.projectId,
            userId: row.userId,
            refreshHash: row.refreshHash,
            expiresAt: asIso(row.expiresAt),
            revokedAt: row.revokedAt ? asIso(row.revokedAt) : undefined,
            offlineTicketHash: row.offlineTicketHash ?? undefined,
            offlineTicketExpiresAt: row.offlineTicketExpiresAt ? asIso(row.offlineTicketExpiresAt) : undefined,
            createdAt: asIso(row.createdAt),
            updatedAt: asIso(row.updatedAt)
        };
    }
    async findTenantSessionById(sessionId) {
        const row = await this.prisma.tenantSession.findUnique({ where: { id: sessionId } });
        if (!row)
            return null;
        return {
            id: row.id,
            projectId: row.projectId,
            userId: row.userId,
            refreshHash: row.refreshHash,
            expiresAt: asIso(row.expiresAt),
            revokedAt: row.revokedAt ? asIso(row.revokedAt) : undefined,
            offlineTicketHash: row.offlineTicketHash ?? undefined,
            offlineTicketExpiresAt: row.offlineTicketExpiresAt ? asIso(row.offlineTicketExpiresAt) : undefined,
            createdAt: asIso(row.createdAt),
            updatedAt: asIso(row.updatedAt)
        };
    }
    async updateTenantSession(sessionId, patch) {
        const current = await this.prisma.tenantSession.findUnique({ where: { id: sessionId } });
        if (!current)
            return;
        await this.prisma.tenantSession.update({
            where: { id: sessionId },
            data: {
                refreshHash: patch.refreshHash ?? current.refreshHash,
                expiresAt: patch.expiresAt ? new Date(patch.expiresAt) : current.expiresAt,
                revokedAt: patch.revokedAt ? new Date(patch.revokedAt) : patch.revokedAt === undefined ? current.revokedAt : null,
                offlineTicketHash: patch.offlineTicketHash ?? current.offlineTicketHash,
                offlineTicketExpiresAt: patch.offlineTicketExpiresAt
                    ? new Date(patch.offlineTicketExpiresAt)
                    : patch.offlineTicketExpiresAt === undefined
                        ? current.offlineTicketExpiresAt
                        : null,
                updatedAt: patch.updatedAt ? new Date(patch.updatedAt) : new Date()
            }
        });
    }
    async hasProcessedBatch(projectId, deviceId, batchId) {
        const row = await this.prisma.syncBatch.findUnique({
            where: {
                projectId_deviceId_batchId: { projectId, deviceId, batchId }
            },
            select: { id: true }
        });
        return Boolean(row);
    }
    async markProcessedBatch(projectId, deviceId, batchId) {
        await this.prisma.syncBatch.upsert({
            where: {
                projectId_deviceId_batchId: { projectId, deviceId, batchId }
            },
            update: {},
            create: {
                id: newId("bat"),
                projectId,
                deviceId,
                batchId
            }
        });
    }
    async hasProcessedEvent(projectId, eventId) {
        const row = await this.prisma.syncEvent.findUnique({
            where: { projectId_eventId: { projectId, eventId } },
            select: { id: true }
        });
        return Boolean(row);
    }
    async markProcessedEvent(projectId, eventId) {
        await this.prisma.syncEvent.upsert({
            where: { projectId_eventId: { projectId, eventId } },
            update: {},
            create: { id: newId("evt"), projectId, eventId }
        });
    }
    async applySyncEvent(projectId, event) {
        const occurredAt = event.occurredAt ?? nowIso();
        return this.prisma.$transaction(async (tx) => {
            const existing = await tx.syncRecord.findUnique({
                where: {
                    projectId_entityType_entityId: {
                        projectId,
                        entityType: event.entityType,
                        entityId: event.entityId
                    }
                }
            });
            const mergedData = event.op === "delete"
                ? parseJsonRecord(existing?.value)
                : {
                    ...parseJsonRecord(existing?.value),
                    ...(event.data ?? {})
                };
            await tx.syncRecord.upsert({
                where: {
                    projectId_entityType_entityId: {
                        projectId,
                        entityType: event.entityType,
                        entityId: event.entityId
                    }
                },
                update: {
                    value: toInputJson(mergedData),
                    updatedAt: new Date(occurredAt),
                    deletedAt: event.op === "delete" ? new Date(occurredAt) : null
                },
                create: {
                    id: newId("rec"),
                    projectId,
                    entityType: event.entityType,
                    entityId: event.entityId,
                    value: toInputJson(mergedData),
                    updatedAt: new Date(occurredAt),
                    deletedAt: event.op === "delete" ? new Date(occurredAt) : null
                }
            });
            const latest = await tx.changeLog.findFirst({
                where: { projectId },
                orderBy: { seq: "desc" },
                select: { seq: true }
            });
            const seq = (latest?.seq ?? 0) + 1;
            const entry = await tx.changeLog.create({
                data: {
                    id: newId("chg"),
                    projectId,
                    seq,
                    entityType: event.entityType,
                    entityId: event.entityId,
                    op: event.op,
                    data: event.data ? toInputJson(event.data) : undefined,
                    occurredAt: new Date(occurredAt)
                }
            });
            return {
                id: entry.id,
                projectId: entry.projectId,
                seq: entry.seq,
                entityType: entry.entityType,
                entityId: entry.entityId,
                op: entry.op,
                data: entry.data ? parseJsonRecord(entry.data) : undefined,
                occurredAt: asIso(entry.occurredAt)
            };
        });
    }
    async pullChanges(projectId, sinceCursor, limit) {
        const rows = await this.prisma.changeLog.findMany({
            where: { projectId, seq: { gt: sinceCursor } },
            orderBy: { seq: "asc" },
            take: limit
        });
        return rows.map((row) => ({
            id: row.id,
            projectId: row.projectId,
            seq: row.seq,
            entityType: row.entityType,
            entityId: row.entityId,
            op: row.op,
            data: row.data ? parseJsonRecord(row.data) : undefined,
            occurredAt: asIso(row.occurredAt)
        }));
    }
    async getLastCursor(projectId) {
        const result = await this.prisma.changeLog.aggregate({
            where: { projectId },
            _max: { seq: true }
        });
        return result._max.seq ?? 0;
    }
    async getCheckpoint(input) {
        const row = await this.prisma.deviceCheckpoint.findUnique({
            where: {
                projectId_userId_deviceId_scope: {
                    projectId: input.projectId,
                    userId: input.userId,
                    deviceId: input.deviceId,
                    scope: input.scope
                }
            }
        });
        return row?.cursor ?? 0;
    }
    async setCheckpoint(input) {
        await this.prisma.deviceCheckpoint.upsert({
            where: {
                projectId_userId_deviceId_scope: {
                    projectId: input.projectId,
                    userId: input.userId,
                    deviceId: input.deviceId,
                    scope: input.scope
                }
            },
            update: {
                cursor: input.cursor
            },
            create: {
                id: newId("chk"),
                projectId: input.projectId,
                userId: input.userId,
                deviceId: input.deviceId,
                scope: input.scope,
                cursor: input.cursor
            }
        });
    }
    async upsertBlobManifest(input) {
        await this.prisma.blobManifest.upsert({
            where: { projectId_cid: { projectId: input.projectId, cid: input.cid } },
            update: {
                mime: input.mime,
                size: input.size,
                bytes: input.bytes ? new Uint8Array(input.bytes) : null
            },
            create: {
                id: newId("blob"),
                projectId: input.projectId,
                cid: input.cid,
                mime: input.mime,
                size: input.size,
                bytes: input.bytes ? new Uint8Array(input.bytes) : null,
                createdAt: input.createdAt ? new Date(input.createdAt) : new Date()
            }
        });
    }
    async getBlobManifest(projectId, cid) {
        const row = await this.prisma.blobManifest.findUnique({
            where: { projectId_cid: { projectId, cid } }
        });
        if (!row)
            return null;
        return {
            projectId: row.projectId,
            cid: row.cid,
            mime: row.mime,
            size: row.size,
            bytes: row.bytes ? Buffer.from(row.bytes) : undefined,
            createdAt: asIso(row.createdAt)
        };
    }
    async listMissingBlobs(projectId, cids) {
        if (!cids.length)
            return [];
        const existing = await this.prisma.blobManifest.findMany({
            where: {
                projectId,
                cid: { in: cids }
            },
            select: { cid: true }
        });
        const found = new Set(existing.map((item) => item.cid));
        return cids.filter((cid) => !found.has(cid));
    }
    async exportProjectData(projectId, entityTypes) {
        const project = await this.getProjectById(projectId);
        if (!project)
            return null;
        const usersRows = await this.prisma.tenantUser.findMany({ where: { projectId } });
        const recordsRows = await this.prisma.syncRecord.findMany({
            where: {
                projectId,
                ...(entityTypes?.length ? { entityType: { in: entityTypes } } : {})
            }
        });
        const changesRows = await this.prisma.changeLog.findMany({
            where: {
                projectId,
                ...(entityTypes?.length ? { entityType: { in: entityTypes } } : {})
            },
            orderBy: { seq: "asc" }
        });
        return {
            project,
            users: usersRows.map((row) => ({
                id: row.id,
                projectId: row.projectId,
                username: row.username,
                displayName: row.displayName,
                passwordHash: row.passwordHash,
                role: row.role,
                status: row.status,
                createdAt: asIso(row.createdAt),
                updatedAt: asIso(row.updatedAt),
                deletedAt: row.deletedAt ? asIso(row.deletedAt) : undefined
            })),
            records: recordsRows.map((row) => ({
                entityType: row.entityType,
                entityId: row.entityId,
                value: parseJsonRecord(row.value),
                updatedAt: asIso(row.updatedAt),
                deletedAt: row.deletedAt ? asIso(row.deletedAt) : undefined
            })),
            changes: changesRows.map((row) => ({
                id: row.id,
                projectId: row.projectId,
                seq: row.seq,
                entityType: row.entityType,
                entityId: row.entityId,
                op: row.op,
                data: row.data ? parseJsonRecord(row.data) : undefined,
                occurredAt: asIso(row.occurredAt)
            }))
        };
    }
    async applyDataMutations(projectId, ops) {
        const result = { applied: [], rejected: [] };
        for (const [index, op] of ops.entries()) {
            if (op.type === "tenant.user.status.set") {
                const updated = await this.updateTenantUserStatus(projectId, op.userId, op.status);
                if (!updated) {
                    result.rejected.push({ index, type: op.type, code: "NOT_FOUND", message: "User not found in project." });
                    continue;
                }
                result.applied.push({ index, type: op.type, target: updated.id });
                continue;
            }
            if (op.type === "tenant.user.soft_delete") {
                const deleted = await this.softDeleteTenantUser(projectId, op.userId);
                if (!deleted) {
                    result.rejected.push({ index, type: op.type, code: "NOT_FOUND", message: "User not found in project." });
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
                    data: op.data
                });
                result.applied.push({ index, type: op.type, target: `${op.entityType}:${op.entityId}` });
                continue;
            }
            result.rejected.push({ index, type: "unknown", code: "INVALID_OP", message: "Unsupported mutation type." });
        }
        return result;
    }
    async createPlatformJob(input) {
        const row = await this.prisma.platformJob.create({
            data: {
                id: newId("job"),
                projectId: input.projectId,
                kind: input.kind,
                status: "queued",
                ...(input.payload ? { payload: toInputJson(input.payload) } : {})
            }
        });
        return {
            id: row.id,
            projectId: row.projectId,
            kind: row.kind,
            status: row.status,
            payload: row.payload ? parseJsonRecord(row.payload) : undefined,
            result: row.result ? parseJsonRecord(row.result) : undefined,
            createdAt: asIso(row.createdAt),
            updatedAt: asIso(row.updatedAt)
        };
    }
    async findPlatformJobById(jobId) {
        const row = await this.prisma.platformJob.findUnique({ where: { id: jobId } });
        if (!row)
            return null;
        return {
            id: row.id,
            projectId: row.projectId,
            kind: row.kind,
            status: row.status,
            payload: row.payload ? parseJsonRecord(row.payload) : undefined,
            result: row.result ? parseJsonRecord(row.result) : undefined,
            createdAt: asIso(row.createdAt),
            updatedAt: asIso(row.updatedAt)
        };
    }
    async updatePlatformJob(jobId, patch) {
        const current = await this.prisma.platformJob.findUnique({ where: { id: jobId } });
        if (!current)
            return;
        await this.prisma.platformJob.update({
            where: { id: jobId },
            data: {
                status: patch.status ?? current.status,
                ...(patch.result ? { result: toInputJson(patch.result) } : {}),
                updatedAt: patch.updatedAt ? new Date(patch.updatedAt) : new Date()
            }
        });
    }
    async appendPlatformAudit(entry) {
        const row = await this.prisma.platformAuditLog.create({
            data: {
                id: newId("audit"),
                actorAdminId: entry.actorAdminId,
                projectId: entry.projectId ?? null,
                action: entry.action,
                ...(entry.reasonCode ? { reasonCode: entry.reasonCode } : {}),
                ...(entry.ticketRef ? { ticketRef: entry.ticketRef } : {}),
                traceId: entry.traceId,
                ...(entry.beforeState ? { beforeState: toInputJson(entry.beforeState) } : {}),
                ...(entry.afterState ? { afterState: toInputJson(entry.afterState) } : {})
            }
        });
        return {
            id: row.id,
            actorAdminId: row.actorAdminId,
            projectId: row.projectId ?? undefined,
            action: row.action,
            reasonCode: row.reasonCode ?? undefined,
            ticketRef: row.ticketRef ?? undefined,
            traceId: row.traceId,
            beforeState: row.beforeState ? parseJsonRecord(row.beforeState) : undefined,
            afterState: row.afterState ? parseJsonRecord(row.afterState) : undefined,
            createdAt: asIso(row.createdAt)
        };
    }
    async listPlatformAudits(projectId) {
        const rows = await this.prisma.platformAuditLog.findMany({
            where: projectId ? { projectId } : undefined,
            orderBy: { createdAt: "asc" }
        });
        return rows.map((row) => ({
            id: row.id,
            actorAdminId: row.actorAdminId,
            projectId: row.projectId ?? undefined,
            action: row.action,
            reasonCode: row.reasonCode ?? undefined,
            ticketRef: row.ticketRef ?? undefined,
            traceId: row.traceId,
            beforeState: row.beforeState ? parseJsonRecord(row.beforeState) : undefined,
            afterState: row.afterState ? parseJsonRecord(row.afterState) : undefined,
            createdAt: asIso(row.createdAt)
        }));
    }
    async createOfflineTicketForTenantSession(sessionId) {
        const session = await this.prisma.tenantSession.findUnique({ where: { id: sessionId } });
        if (!session)
            return null;
        const ticket = newId("offtk");
        await this.updateTenantSession(sessionId, {
            offlineTicketHash: hashSecret(ticket),
            offlineTicketExpiresAt: addDays(30)
        });
        return ticket;
    }
}
