import type { DataMutationOp } from "../contracts";
import type {
  ChangeLogEntry,
  DataMutationResult,
  PlatformAdminUser,
  PlatformAuditLog,
  PlatformJob,
  PlatformSession,
  Project,
  ProjectLifecycleStatus,
  SyncEventInput,
  TenantSession,
  TenantUser,
  UserStatus
} from "../types";
import { hashSecret } from "../utils/crypto";
import { addDays, newId, nowIso } from "../utils/common";
import type { BlobManifest, DataStore, ProjectDataExport, SyncRecord } from "./store";

function canonicalUsername(value: string) {
  return value.trim().toLowerCase();
}

type CheckpointKey = `${string}:${string}:${string}:${string}`;

export class MemoryStore implements DataStore {
  private readonly projects = new Map<string, Project>();
  private readonly projectByKey = new Map<string, string>();

  private readonly platformAdmins = new Map<string, PlatformAdminUser>();
  private readonly platformAdminByUsername = new Map<string, string>();
  private readonly platformSessions = new Map<string, PlatformSession>();
  private readonly platformJobs = new Map<string, PlatformJob>();
  private readonly platformAudits = new Map<string, PlatformAuditLog>();

  private readonly tenantUsers = new Map<string, TenantUser>();
  private readonly tenantUserByUsername = new Map<string, string>();
  private readonly tenantSessions = new Map<string, TenantSession>();

  private readonly processedBatches = new Set<string>();
  private readonly processedEvents = new Set<string>();

  private readonly syncRecords = new Map<string, SyncRecord>();
  private readonly changeLogs = new Map<string, ChangeLogEntry[]>();
  private readonly checkpoints = new Map<CheckpointKey, number>();

  private readonly blobManifests = new Map<string, BlobManifest>();

  private bootstrapped = false;

  async ensureBootstrap() {
    if (this.bootstrapped) return;

    const seedProjects: Array<{ key: string; name: string }> = [
      { key: "somasmart", name: "SomaSmart" },
      { key: "rafikiplus", name: "RafikiPlus" }
    ];
    for (const p of seedProjects) {
      const project = await this.createProject({ key: p.key, name: p.name });
      // Seed a tenant admin per project for integration testing.
      await this.createTenantUser({
        projectId: project.id,
        username: "admin",
        displayName: `${project.name} Admin`,
        passwordHash: hashSecret("admin12345"),
        role: "admin"
      });
    }

    const platform = {
      id: newId("padm"),
      username: "platform_admin",
      passwordHash: hashSecret("platform12345"),
      createdAt: nowIso(),
      updatedAt: nowIso()
    } satisfies PlatformAdminUser;

    this.platformAdmins.set(platform.id, platform);
    this.platformAdminByUsername.set(canonicalUsername(platform.username), platform.id);

    this.bootstrapped = true;
  }

  async getProjectById(projectId: string) {
    return this.projects.get(projectId) ?? null;
  }

  async getProjectByKey(projectKey: string) {
    const id = this.projectByKey.get(projectKey.toLowerCase());
    if (!id) return null;
    return this.projects.get(id) ?? null;
  }

  async listProjects() {
    return [...this.projects.values()].sort((a, b) => a.key.localeCompare(b.key));
  }

  async createProject(input: { key: string; name: string }) {
    const key = input.key.trim().toLowerCase();
    if (this.projectByKey.has(key)) {
      throw new Error("PROJECT_KEY_EXISTS");
    }
    const createdAt = nowIso();
    const project: Project = {
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

  async updateProject(projectId: string, patch: { name?: string; status?: ProjectLifecycleStatus }) {
    const current = this.projects.get(projectId);
    if (!current) return null;
    const next: Project = {
      ...current,
      name: patch.name?.trim() || current.name,
      status: patch.status ?? current.status,
      updatedAt: nowIso()
    };
    this.projects.set(projectId, next);
    return next;
  }

  async findPlatformAdminByUsername(username: string) {
    const id = this.platformAdminByUsername.get(canonicalUsername(username));
    if (!id) return null;
    return this.platformAdmins.get(id) ?? null;
  }

  async findPlatformAdminById(adminId: string) {
    return this.platformAdmins.get(adminId) ?? null;
  }

  async createPlatformSession(input: { platformAdminId: string; refreshHash: string; expiresAt: string }) {
    const createdAt = nowIso();
    const session: PlatformSession = {
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

  async findPlatformSessionById(sessionId: string) {
    return this.platformSessions.get(sessionId) ?? null;
  }

  async updatePlatformSession(
    sessionId: string,
    patch: Partial<Pick<PlatformSession, "refreshHash" | "expiresAt" | "revokedAt" | "updatedAt">>
  ) {
    const current = this.platformSessions.get(sessionId);
    if (!current) return;
    this.platformSessions.set(sessionId, {
      ...current,
      ...patch,
      updatedAt: patch.updatedAt ?? nowIso()
    });
  }

  private tenantUsernameKey(projectId: string, username: string) {
    return `${projectId}:${canonicalUsername(username)}`;
  }

  async findTenantUserByUsername(projectId: string, username: string) {
    const id = this.tenantUserByUsername.get(this.tenantUsernameKey(projectId, username));
    if (!id) return null;
    return this.tenantUsers.get(id) ?? null;
  }

  async findTenantUserById(projectId: string, userId: string) {
    const user = this.tenantUsers.get(userId);
    if (!user) return null;
    return user.projectId === projectId ? user : null;
  }

  async createTenantUser(input: {
    projectId: string;
    username: string;
    displayName: string;
    passwordHash: string;
    role: TenantUser["role"];
  }) {
    const usernameKey = this.tenantUsernameKey(input.projectId, input.username);
    if (this.tenantUserByUsername.has(usernameKey)) {
      throw new Error("USERNAME_EXISTS");
    }
    const createdAt = nowIso();
    const user: TenantUser = {
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

  async updateTenantUserStatus(projectId: string, userId: string, status: UserStatus) {
    const user = await this.findTenantUserById(projectId, userId);
    if (!user) return null;
    const next: TenantUser = {
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

  async softDeleteTenantUser(projectId: string, userId: string) {
    const user = await this.findTenantUserById(projectId, userId);
    if (!user) return null;
    const deletedAt = nowIso();
    const next: TenantUser = {
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

  async createTenantSession(input: {
    projectId: string;
    userId: string;
    refreshHash: string;
    expiresAt: string;
    offlineTicketHash?: string;
    offlineTicketExpiresAt?: string;
  }) {
    const createdAt = nowIso();
    const session: TenantSession = {
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

  async findTenantSessionById(sessionId: string) {
    return this.tenantSessions.get(sessionId) ?? null;
  }

  async updateTenantSession(
    sessionId: string,
    patch: Partial<Pick<TenantSession, "refreshHash" | "expiresAt" | "revokedAt" | "updatedAt" | "offlineTicketHash" | "offlineTicketExpiresAt">>
  ) {
    const current = this.tenantSessions.get(sessionId);
    if (!current) return;
    this.tenantSessions.set(sessionId, {
      ...current,
      ...patch,
      updatedAt: patch.updatedAt ?? nowIso()
    });
  }

  private batchKey(projectId: string, deviceId: string, batchId: string) {
    return `${projectId}:${deviceId}:${batchId}`;
  }

  async hasProcessedBatch(projectId: string, deviceId: string, batchId: string) {
    return this.processedBatches.has(this.batchKey(projectId, deviceId, batchId));
  }

  async markProcessedBatch(projectId: string, deviceId: string, batchId: string) {
    this.processedBatches.add(this.batchKey(projectId, deviceId, batchId));
  }

  private eventKey(projectId: string, eventId: string) {
    return `${projectId}:${eventId}`;
  }

  async hasProcessedEvent(projectId: string, eventId: string) {
    return this.processedEvents.has(this.eventKey(projectId, eventId));
  }

  async markProcessedEvent(projectId: string, eventId: string) {
    this.processedEvents.add(this.eventKey(projectId, eventId));
  }

  private recordKey(projectId: string, entityType: string, entityId: string) {
    return `${projectId}:${entityType}:${entityId}`;
  }

  private ensureChangeLog(projectId: string) {
    const existing = this.changeLogs.get(projectId);
    if (existing) return existing;
    const created: ChangeLogEntry[] = [];
    this.changeLogs.set(projectId, created);
    return created;
  }

  async applySyncEvent(projectId: string, event: SyncEventInput) {
    const occurredAt = event.occurredAt ?? nowIso();
    const recordKey = this.recordKey(projectId, event.entityType, event.entityId);

    if (event.op === "delete") {
      const existing = this.syncRecords.get(recordKey);
      const tombstone: SyncRecord = {
        projectId,
        entityType: event.entityType,
        entityId: event.entityId,
        value: existing?.value ?? {},
        updatedAt: occurredAt,
        deletedAt: occurredAt
      };
      this.syncRecords.set(recordKey, tombstone);
    } else {
      const merged: SyncRecord = {
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
    const entry: ChangeLogEntry = {
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

  async pullChanges(projectId: string, sinceCursor: number, limit: number) {
    const list = this.ensureChangeLog(projectId);
    return list.filter((entry) => entry.seq > sinceCursor).slice(0, limit);
  }

  async getLastCursor(projectId: string) {
    const list = this.ensureChangeLog(projectId);
    return list.length;
  }

  private checkpointKey(input: { projectId: string; userId: string; deviceId: string; scope: string }): CheckpointKey {
    return `${input.projectId}:${input.userId}:${input.deviceId}:${input.scope}`;
  }

  async getCheckpoint(input: { projectId: string; userId: string; deviceId: string; scope: string }) {
    return this.checkpoints.get(this.checkpointKey(input)) ?? 0;
  }

  async setCheckpoint(input: { projectId: string; userId: string; deviceId: string; scope: string; cursor: number }) {
    this.checkpoints.set(this.checkpointKey(input), input.cursor);
  }

  private blobKey(projectId: string, cid: string) {
    return `${projectId}:${cid}`;
  }

  async upsertBlobManifest(input: BlobManifest) {
    this.blobManifests.set(this.blobKey(input.projectId, input.cid), {
      ...input,
      createdAt: input.createdAt || nowIso()
    });
  }

  async getBlobManifest(projectId: string, cid: string) {
    return this.blobManifests.get(this.blobKey(projectId, cid)) ?? null;
  }

  async listMissingBlobs(projectId: string, cids: string[]) {
    return cids.filter((cid) => !this.blobManifests.has(this.blobKey(projectId, cid)));
  }

  async exportProjectData(projectId: string, entityTypes?: string[]): Promise<ProjectDataExport | null> {
    const project = await this.getProjectById(projectId);
    if (!project) return null;

    const users = [...this.tenantUsers.values()].filter((u) => u.projectId === projectId);
    const records = [...this.syncRecords.values()]
      .filter((r) => r.projectId === projectId)
      .filter((r) => (entityTypes?.length ? entityTypes.includes(r.entityType) : true));
    const changes = (await this.pullChanges(projectId, 0, Number.MAX_SAFE_INTEGER)).filter((c) =>
      entityTypes?.length ? entityTypes.includes(c.entityType) : true
    );

    return { project, users, records, changes };
  }

  async applyDataMutations(projectId: string, ops: DataMutationOp[]): Promise<DataMutationResult> {
    const result: DataMutationResult = { applied: [], rejected: [] };

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

  async createPlatformJob(input: { projectId: string; kind: string; payload?: Record<string, unknown> }) {
    const now = nowIso();
    const job: PlatformJob = {
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

  async findPlatformJobById(jobId: string) {
    return this.platformJobs.get(jobId) ?? null;
  }

  async updatePlatformJob(jobId: string, patch: Partial<Pick<PlatformJob, "status" | "result" | "updatedAt">>) {
    const current = this.platformJobs.get(jobId);
    if (!current) return;
    this.platformJobs.set(jobId, {
      ...current,
      ...patch,
      updatedAt: patch.updatedAt ?? nowIso()
    });
  }

  async appendPlatformAudit(entry: Omit<PlatformAuditLog, "id" | "createdAt">) {
    const created: PlatformAuditLog = {
      ...entry,
      id: newId("audit"),
      createdAt: nowIso()
    };
    this.platformAudits.set(created.id, created);
    return created;
  }

  async listPlatformAudits(projectId?: string) {
    const audits = [...this.platformAudits.values()];
    if (!projectId) return audits;
    return audits.filter((a) => a.projectId === projectId);
  }

  async createOfflineTicketForTenantSession(sessionId: string) {
    const session = this.tenantSessions.get(sessionId);
    if (!session) return null;
    const ticket = newId("offtk");
    await this.updateTenantSession(sessionId, {
      offlineTicketHash: hashSecret(ticket),
      offlineTicketExpiresAt: addDays(30)
    });
    return ticket;
  }
}
