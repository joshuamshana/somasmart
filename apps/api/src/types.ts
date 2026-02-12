export type TokenClass = "tenant_access" | "tenant_refresh" | "platform_access" | "platform_refresh";

export type ProjectLifecycleStatus = "active" | "suspended" | "archived";
export type TenantRole = "student" | "teacher" | "admin" | "school_admin";
export type UserStatus = "active" | "pending" | "suspended";

export type Project = {
  id: string;
  key: string;
  name: string;
  status: ProjectLifecycleStatus;
  createdAt: string;
  updatedAt: string;
};

export type PlatformAdminUser = {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
};

export type TenantUser = {
  id: string;
  projectId: string;
  username: string;
  displayName: string;
  passwordHash: string;
  role: TenantRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

export type SessionRecord = {
  id: string;
  refreshHash: string;
  expiresAt: string;
  revokedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type PlatformSession = SessionRecord & {
  platformAdminId: string;
};

export type TenantSession = SessionRecord & {
  projectId: string;
  userId: string;
  offlineTicketHash?: string;
  offlineTicketExpiresAt?: string;
};

export type SyncEventInput = {
  eventId: string;
  entityType: string;
  entityId: string;
  op: "upsert" | "delete";
  data?: Record<string, unknown>;
  occurredAt?: string;
};

export type ChangeLogEntry = {
  id: string;
  projectId: string;
  seq: number;
  entityType: string;
  entityId: string;
  op: "upsert" | "delete";
  data?: Record<string, unknown>;
  occurredAt: string;
};

export type PlatformJobStatus = "queued" | "running" | "succeeded" | "failed";

export type PlatformJob = {
  id: string;
  projectId: string;
  kind: string;
  status: PlatformJobStatus;
  payload?: Record<string, unknown>;
  result?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type PlatformAuditLog = {
  id: string;
  actorAdminId: string;
  projectId?: string;
  action: string;
  reasonCode?: string;
  ticketRef?: string;
  traceId: string;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  createdAt: string;
};

export type PlatformAdminClaims = {
  sub: string;
  username: string;
  tokenClass: "platform_access" | "platform_refresh";
  sid: string;
};

export type TenantClaims = {
  sub: string;
  projectId: string;
  projectKey: string;
  role: TenantRole;
  username: string;
  tokenClass: "tenant_access" | "tenant_refresh";
  sid: string;
};

export type AuditEnvelope = {
  reasonCode: string;
  ticketRef: string;
  actor: string;
  projectId: string;
  traceId: string;
};

export type DataMutationResult = {
  applied: Array<{ index: number; type: string; target?: string }>;
  rejected: Array<{ index: number; type: string; code: string; message: string }>;
};
