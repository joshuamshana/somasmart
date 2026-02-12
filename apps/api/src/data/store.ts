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

export type BlobManifest = {
  projectId: string;
  cid: string;
  mime: string;
  size: number;
  bytes?: Buffer;
  createdAt: string;
};

export type ProjectDataExport = {
  project: Project;
  users: TenantUser[];
  records: Array<{ entityType: string; entityId: string; value: Record<string, unknown>; updatedAt: string; deletedAt?: string }>;
  changes: ChangeLogEntry[];
};

export type SyncRecord = {
  projectId: string;
  entityType: string;
  entityId: string;
  value: Record<string, unknown>;
  updatedAt: string;
  deletedAt?: string;
};

export interface DataStore {
  ensureBootstrap(): Promise<void>;

  getProjectById(projectId: string): Promise<Project | null>;
  getProjectByKey(projectKey: string): Promise<Project | null>;
  listProjects(): Promise<Project[]>;
  createProject(input: { key: string; name: string }): Promise<Project>;
  updateProject(projectId: string, patch: { name?: string; status?: ProjectLifecycleStatus }): Promise<Project | null>;

  findPlatformAdminByUsername(username: string): Promise<PlatformAdminUser | null>;
  findPlatformAdminById(adminId: string): Promise<PlatformAdminUser | null>;
  createPlatformSession(input: {
    platformAdminId: string;
    refreshHash: string;
    expiresAt: string;
  }): Promise<PlatformSession>;
  findPlatformSessionById(sessionId: string): Promise<PlatformSession | null>;
  updatePlatformSession(sessionId: string, patch: Partial<Pick<PlatformSession, "refreshHash" | "expiresAt" | "revokedAt" | "updatedAt">>): Promise<void>;

  findTenantUserByUsername(projectId: string, username: string): Promise<TenantUser | null>;
  findTenantUserById(projectId: string, userId: string): Promise<TenantUser | null>;
  createTenantUser(input: {
    projectId: string;
    username: string;
    displayName: string;
    passwordHash: string;
    role: TenantUser["role"];
  }): Promise<TenantUser>;
  updateTenantUserStatus(projectId: string, userId: string, status: UserStatus): Promise<TenantUser | null>;
  softDeleteTenantUser(projectId: string, userId: string): Promise<TenantUser | null>;

  createTenantSession(input: {
    projectId: string;
    userId: string;
    refreshHash: string;
    expiresAt: string;
    offlineTicketHash?: string;
    offlineTicketExpiresAt?: string;
  }): Promise<TenantSession>;
  findTenantSessionById(sessionId: string): Promise<TenantSession | null>;
  updateTenantSession(sessionId: string, patch: Partial<Pick<TenantSession, "refreshHash" | "expiresAt" | "revokedAt" | "updatedAt" | "offlineTicketHash" | "offlineTicketExpiresAt">>): Promise<void>;
  createOfflineTicketForTenantSession(sessionId: string): Promise<string | null>;

  hasProcessedBatch(projectId: string, deviceId: string, batchId: string): Promise<boolean>;
  markProcessedBatch(projectId: string, deviceId: string, batchId: string): Promise<void>;
  hasProcessedEvent(projectId: string, eventId: string): Promise<boolean>;
  markProcessedEvent(projectId: string, eventId: string): Promise<void>;

  applySyncEvent(projectId: string, event: SyncEventInput): Promise<ChangeLogEntry>;
  pullChanges(projectId: string, sinceCursor: number, limit: number): Promise<ChangeLogEntry[]>;
  getLastCursor(projectId: string): Promise<number>;

  getCheckpoint(input: { projectId: string; userId: string; deviceId: string; scope: string }): Promise<number>;
  setCheckpoint(input: { projectId: string; userId: string; deviceId: string; scope: string; cursor: number }): Promise<void>;

  upsertBlobManifest(input: BlobManifest): Promise<void>;
  getBlobManifest(projectId: string, cid: string): Promise<BlobManifest | null>;
  listMissingBlobs(projectId: string, cids: string[]): Promise<string[]>;

  exportProjectData(projectId: string, entityTypes?: string[]): Promise<ProjectDataExport | null>;
  applyDataMutations(projectId: string, ops: DataMutationOp[]): Promise<DataMutationResult>;

  createPlatformJob(input: { projectId: string; kind: string; payload?: Record<string, unknown> }): Promise<PlatformJob>;
  findPlatformJobById(jobId: string): Promise<PlatformJob | null>;
  updatePlatformJob(jobId: string, patch: Partial<Pick<PlatformJob, "status" | "result" | "updatedAt">>): Promise<void>;

  appendPlatformAudit(entry: Omit<PlatformAuditLog, "id" | "createdAt">): Promise<PlatformAuditLog>;
  listPlatformAudits(projectId?: string): Promise<PlatformAuditLog[]>;
}
