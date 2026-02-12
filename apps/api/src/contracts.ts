import { z } from "zod";

export const projectKeySchema = z.string().trim().min(2).max(64).regex(/^[a-z0-9_-]+$/i);
export const reasonCodeSchema = z.string().trim().min(2).max(64);
export const ticketRefSchema = z.string().trim().min(2).max(128);

export const platformAuthLoginSchema = z.object({
  username: z.string().trim().min(3).max(120),
  password: z.string().min(8).max(256)
});

export const tenantRegisterSchema = z.object({
  projectKey: projectKeySchema,
  username: z.string().trim().min(3).max(120),
  password: z.string().min(8).max(256),
  displayName: z.string().trim().min(2).max(120),
  role: z.enum(["student", "teacher", "admin", "school_admin"]).optional()
});

export const tenantLoginSchema = z.object({
  projectKey: projectKeySchema,
  username: z.string().trim().min(3).max(120),
  password: z.string().min(8).max(256),
  deviceId: z.string().trim().min(3).max(120)
});

export const platformProjectCreateSchema = z.object({
  key: projectKeySchema,
  name: z.string().trim().min(2).max(120)
});

export const platformProjectPatchSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    status: z.enum(["active", "suspended", "archived"]).optional()
  })
  .refine((value) => Boolean(value.name || value.status), {
    message: "At least one field must be provided."
  });

export const syncEventSchema = z.object({
  eventId: z.string().trim().min(3).max(120),
  entityType: z.string().trim().min(2).max(80),
  entityId: z.string().trim().min(2).max(120),
  op: z.enum(["upsert", "delete"]),
  data: z.record(z.unknown()).optional(),
  occurredAt: z.string().datetime().optional()
});

export const syncPushSchema = z.object({
  deviceId: z.string().trim().min(3).max(120),
  batchId: z.string().trim().min(3).max(120),
  events: z.array(syncEventSchema).max(500)
});

export const syncPullSchema = z.object({
  deviceId: z.string().trim().min(3).max(120),
  checkpoints: z.record(z.number().int().nonnegative()).default({}),
  scopes: z.array(z.string().trim().min(1).max(80)).max(20).optional()
});

export const blobNeedSchema = z.object({
  cids: z.array(z.string().trim().min(3).max(256)).max(500)
});

export const platformDataExportSchema = z.object({
  reasonCode: reasonCodeSchema,
  ticketRef: ticketRefSchema,
  entityTypes: z.array(z.string().trim().min(2).max(80)).max(50).optional()
});

const upsertUserStatusMutationSchema = z.object({
  type: z.literal("tenant.user.status.set"),
  userId: z.string().trim().min(3).max(120),
  status: z.enum(["active", "pending", "suspended"])
});

const softDeleteUserMutationSchema = z.object({
  type: z.literal("tenant.user.soft_delete"),
  userId: z.string().trim().min(3).max(120)
});

const upsertRecordMutationSchema = z.object({
  type: z.literal("tenant.record.upsert"),
  entityType: z.string().trim().min(2).max(80),
  entityId: z.string().trim().min(2).max(120),
  data: z.record(z.unknown())
});

export const dataMutationOpSchema = z.discriminatedUnion("type", [
  upsertUserStatusMutationSchema,
  softDeleteUserMutationSchema,
  upsertRecordMutationSchema
]);

export const platformDataMutationsSchema = z.object({
  reasonCode: reasonCodeSchema,
  ticketRef: ticketRefSchema,
  ops: z.array(dataMutationOpSchema).min(1).max(200)
});

export const platformDataReindexSchema = z.object({
  reasonCode: reasonCodeSchema,
  ticketRef: ticketRefSchema,
  targets: z.array(z.string().trim().min(2).max(80)).max(30).optional()
});

export type DataMutationRequest = z.infer<typeof platformDataMutationsSchema>;
export type DataMutationOp = z.infer<typeof dataMutationOpSchema>;
