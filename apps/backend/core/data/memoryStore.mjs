import { getBootstrapSeedConfig } from "../config/bootstrap.mjs";
import { hashSecret } from "../lib/crypto.mjs";
import { addDays, newId, nowIso } from "../lib/common.mjs";
function canonicalUsername(value) {
    return value.trim().toLowerCase();
}
export class MemoryStore {
    projects = new Map();
    projectByKey = new Map();
    platformAdmins = new Map();
    platformAdminByUsername = new Map();
    platformSessions = new Map();
    platformJobs = new Map();
    platformAudits = new Map();
    tenantUsers = new Map();
    tenantUserByUsername = new Map();
    tenantSessions = new Map();
    processedBatches = new Set();
    processedEvents = new Set();
    syncRecords = new Map();
    changeLogs = new Map();
    checkpoints = new Map();
    blobManifests = new Map();
    bootstrapped = false;
    async ensureBootstrap() {
        if (this.bootstrapped)
            return;
        const seed = getBootstrapSeedConfig();
        const project = await this.createProject({ key: seed.projectKey, name: seed.projectName });
        await this.createTenantUser({
            projectId: project.id,
            username: seed.tenantAdminUsername,
            displayName: `${project.name} Admin`,
            passwordHash: hashSecret(seed.tenantAdminPassword),
            role: "admin"
        });
        const platform = {
            id: newId("padm"),
            username: seed.platformAdminUsername,
            passwordHash: hashSecret(seed.platformAdminPassword),
            createdAt: nowIso(),
            updatedAt: nowIso()
        };
        this.platformAdmins.set(platform.id, platform);
        this.platformAdminByUsername.set(canonicalUsername(platform.username), platform.id);
        this.bootstrapped = true;
    }
    async getProjectById(projectId) {
        return this.projects.get(projectId) ?? null;
    }
    async getProjectByKey(projectKey) {
        const id = this.projectByKey.get(projectKey.toLowerCase());
        if (!id)
            return null;
        return this.projects.get(id) ?? null;
    }
    async listProjects() {
        return [...this.projects.values()].sort((a, b) => a.key.localeCompare(b.key));
    }
    async createProject(input) {
        const key = input.key.trim().toLowerCase();
        if (this.projectByKey.has(key)) {
            throw new Error("PROJECT_KEY_EXISTS");
        }
        const createdAt = nowIso();
        const project = {
            id: newId("prj"),
            key,
            name: input.name.trim(),
            status: "active",
            createdAt,
            updatedAt: createdAt
        };
        this.projects.set(project.id, project);
        this.projectByKey.set(project.key, project.id);
        return project;
    }
    async updateProject(projectId, patch) {
        const current = this.projects.get(projectId);
        if (!current)
            return null;
        const next = {
            ...current,
            name: patch.name?.trim() || current.name,
            status: patch.status ?? current.status,
            updatedAt: nowIso()
        };
        this.projects.set(projectId, next);
        return next;
    }
    async findPlatformAdminByUsername(username) {
        const id = this.platformAdminByUsername.get(canonicalUsername(username));
        if (!id)
            return null;
        return this.platformAdmins.get(id) ?? null;
    }
    async findPlatformAdminById(adminId) {
        return this.platformAdmins.get(adminId) ?? null;
    }
    async createPlatformSession(input) {
        const createdAt = nowIso();
        const session = {
            id: newId("psess"),
            platformAdminId: input.platformAdminId,
            refreshHash: input.refreshHash,
            expiresAt: input.expiresAt,
            createdAt,
            updatedAt: createdAt
        };
        this.platformSessions.set(session.id, session);
        return session;
    }
    async findPlatformSessionById(sessionId) {
        return this.platformSessions.get(sessionId) ?? null;
    }
    async updatePlatformSession(sessionId, patch) {
        const current = this.platformSessions.get(sessionId);
        if (!current)
            return;
        this.platformSessions.set(sessionId, {
            ...current,
            ...patch,
            updatedAt: patch.updatedAt ?? nowIso()
        });
    }
    tenantUsernameKey(projectId, username) {
        return `${projectId}:${canonicalUsername(username)}`;
    }
    async findTenantUserByUsername(projectId, username) {
        const id = this.tenantUserByUsername.get(this.tenantUsernameKey(projectId, username));
        if (!id)
            return null;
        return this.tenantUsers.get(id) ?? null;
    }
    async findTenantUserById(projectId, userId) {
        const user = this.tenantUsers.get(userId);
        if (!user)
            return null;
        return user.projectId === projectId ? user : null;
    }
    async createTenantUser(input) {
        const usernameKey = this.tenantUsernameKey(input.projectId, input.username);
        if (this.tenantUserByUsername.has(usernameKey)) {
            throw new Error("USERNAME_EXISTS");
        }
        const createdAt = nowIso();
        const user = {
            id: newId("usr"),
            projectId: input.projectId,
            username: input.username.trim(),
            displayName: input.displayName.trim(),
            passwordHash: input.passwordHash,
            role: input.role,
            status: "active",
            createdAt,
            updatedAt: createdAt
        };
        this.tenantUsers.set(user.id, user);
        this.tenantUserByUsername.set(usernameKey, user.id);
        await this.applySyncEvent(input.projectId, {
            eventId: newId("seed_evt"),
            entityType: "users",
            entityId: user.id,
            op: "upsert",
            data: { ...user }
        });
        return user;
    }
    async updateTenantUserStatus(projectId, userId, status) {
        const user = await this.findTenantUserById(projectId, userId);
        if (!user)
            return null;
        const next = {
            ...user,
            status,
            updatedAt: nowIso()
        };
        this.tenantUsers.set(next.id, next);
        await this.applySyncEvent(projectId, {
            eventId: newId("evt"),
            entityType: "users",
            entityId: next.id,
            op: "upsert",
            data: { id: next.id, status: next.status, updatedAt: next.updatedAt }
        });
        return next;
    }
    async softDeleteTenantUser(projectId, userId) {
        const user = await this.findTenantUserById(projectId, userId);
        if (!user)
            return null;
        const deletedAt = nowIso();
        const next = {
            ...user,
            deletedAt,
            updatedAt: deletedAt
        };
        this.tenantUsers.set(next.id, next);
        await this.applySyncEvent(projectId, {
            eventId: newId("evt"),
            entityType: "users",
            entityId: next.id,
            op: "delete",
            data: { deletedAt }
        });
        return next;
    }
    async createTenantSession(input) {
        const createdAt = nowIso();
        const session = {
            id: newId("tsess"),
            projectId: input.projectId,
            userId: input.userId,
            refreshHash: input.refreshHash,
            expiresAt: input.expiresAt,
            offlineTicketHash: input.offlineTicketHash,
            offlineTicketExpiresAt: input.offlineTicketExpiresAt,
            createdAt,
            updatedAt: createdAt
        };
        this.tenantSessions.set(session.id, session);
        return session;
    }
    async findTenantSessionById(sessionId) {
        return this.tenantSessions.get(sessionId) ?? null;
    }
    async updateTenantSession(sessionId, patch) {
        const current = this.tenantSessions.get(sessionId);
        if (!current)
            return;
        this.tenantSessions.set(sessionId, {
            ...current,
            ...patch,
            updatedAt: patch.updatedAt ?? nowIso()
        });
    }
    batchKey(projectId, deviceId, batchId) {
        return `${projectId}:${deviceId}:${batchId}`;
    }
    async hasProcessedBatch(projectId, deviceId, batchId) {
        return this.processedBatches.has(this.batchKey(projectId, deviceId, batchId));
    }
    async markProcessedBatch(projectId, deviceId, batchId) {
        this.processedBatches.add(this.batchKey(projectId, deviceId, batchId));
    }
    eventKey(projectId, eventId) {
        return `${projectId}:${eventId}`;
    }
    async hasProcessedEvent(projectId, eventId) {
        return this.processedEvents.has(this.eventKey(projectId, eventId));
    }
    async markProcessedEvent(projectId, eventId) {
        this.processedEvents.add(this.eventKey(projectId, eventId));
    }
    recordKey(projectId, entityType, entityId) {
        return `${projectId}:${entityType}:${entityId}`;
    }
    ensureChangeLog(projectId) {
        const existing = this.changeLogs.get(projectId);
        if (existing)
            return existing;
        const created = [];
        this.changeLogs.set(projectId, created);
        return created;
    }
    async applySyncEvent(projectId, event) {
        const occurredAt = event.occurredAt ?? nowIso();
        const recordKey = this.recordKey(projectId, event.entityType, event.entityId);
        if (event.op === "delete") {
            const existing = this.syncRecords.get(recordKey);
            const tombstone = {
                projectId,
                entityType: event.entityType,
                entityId: event.entityId,
                value: existing?.value ?? {},
                updatedAt: occurredAt,
                deletedAt: occurredAt
            };
            this.syncRecords.set(recordKey, tombstone);
        }
        else {
            const merged = {
                projectId,
                entityType: event.entityType,
                entityId: event.entityId,
                value: {
                    ...(this.syncRecords.get(recordKey)?.value ?? {}),
                    ...(event.data ?? {})
                },
                updatedAt: occurredAt
            };
            this.syncRecords.set(recordKey, merged);
        }
        const changeLog = this.ensureChangeLog(projectId);
        const seq = changeLog.length + 1;
        const entry = {
            id: newId("chg"),
            projectId,
            seq,
            entityType: event.entityType,
            entityId: event.entityId,
            op: event.op,
            data: event.data,
            occurredAt
        };
        changeLog.push(entry);
        return entry;
    }
    async pullChanges(projectId, sinceCursor, limit) {
        const list = this.ensureChangeLog(projectId);
        return list.filter((entry) => entry.seq > sinceCursor).slice(0, limit);
    }
    async getLastCursor(projectId) {
        const list = this.ensureChangeLog(projectId);
        return list.length;
    }
    checkpointKey(input) {
        return `${input.projectId}:${input.userId}:${input.deviceId}:${input.scope}`;
    }
    async getCheckpoint(input) {
        return this.checkpoints.get(this.checkpointKey(input)) ?? 0;
    }
    async setCheckpoint(input) {
        this.checkpoints.set(this.checkpointKey(input), input.cursor);
    }
    blobKey(projectId, cid) {
        return `${projectId}:${cid}`;
    }
    async upsertBlobManifest(input) {
        this.blobManifests.set(this.blobKey(input.projectId, input.cid), {
            ...input,
            createdAt: input.createdAt || nowIso()
        });
    }
    async getBlobManifest(projectId, cid) {
        return this.blobManifests.get(this.blobKey(projectId, cid)) ?? null;
    }
    async listMissingBlobs(projectId, cids) {
        return cids.filter((cid) => !this.blobManifests.has(this.blobKey(projectId, cid)));
    }
    async exportProjectData(projectId, entityTypes) {
        const project = await this.getProjectById(projectId);
        if (!project)
            return null;
        const users = [...this.tenantUsers.values()].filter((u) => u.projectId === projectId);
        const records = [...this.syncRecords.values()]
            .filter((r) => r.projectId === projectId)
            .filter((r) => (entityTypes?.length ? entityTypes.includes(r.entityType) : true));
        const changes = (await this.pullChanges(projectId, 0, Number.MAX_SAFE_INTEGER)).filter((c) => entityTypes?.length ? entityTypes.includes(c.entityType) : true);
        return { project, users, records, changes };
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
        const now = nowIso();
        const job = {
            id: newId("job"),
            projectId: input.projectId,
            kind: input.kind,
            status: "queued",
            payload: input.payload,
            createdAt: now,
            updatedAt: now
        };
        this.platformJobs.set(job.id, job);
        return job;
    }
    async findPlatformJobById(jobId) {
        return this.platformJobs.get(jobId) ?? null;
    }
    async updatePlatformJob(jobId, patch) {
        const current = this.platformJobs.get(jobId);
        if (!current)
            return;
        this.platformJobs.set(jobId, {
            ...current,
            ...patch,
            updatedAt: patch.updatedAt ?? nowIso()
        });
    }
    async appendPlatformAudit(entry) {
        const created = {
            ...entry,
            id: newId("audit"),
            createdAt: nowIso()
        };
        this.platformAudits.set(created.id, created);
        return created;
    }
    async listPlatformAudits(projectId) {
        const audits = [...this.platformAudits.values()];
        if (!projectId)
            return audits;
        return audits.filter((a) => a.projectId === projectId);
    }
    async createOfflineTicketForTenantSession(sessionId) {
        const session = this.tenantSessions.get(sessionId);
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
