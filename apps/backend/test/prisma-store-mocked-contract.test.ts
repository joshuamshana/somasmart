import { describe, expect, it } from "vitest";
import { PrismaStore } from "../core/data/prismaStore.mjs";

const D1 = new Date("2024-01-01T00:00:00.000Z");
const D2 = new Date("2024-01-02T00:00:00.000Z");

describe("PrismaStore mocked contract", () => {
  it("runs ensureBootstrap and project/admin/session helpers", async () => {
    const calls: string[] = [];
    process.env.SEED_PROJECT_KEY = "SOMASMART";
    process.env.SEED_PROJECT_NAME = "Soma Smart";
    process.env.SEED_TENANT_ADMIN_USERNAME = "Admin";
    process.env.SEED_TENANT_ADMIN_PASSWORD = "admin-pass-123";
    process.env.SEED_PLATFORM_ADMIN_USERNAME = "PlatformAdmin";
    process.env.SEED_PLATFORM_ADMIN_PASSWORD = "platform-pass-123";

    const prisma = {
      project: {
        upsert: async () => ({ id: "prj_1", key: "somasmart", name: "Soma Smart", status: "active", createdAt: D1, updatedAt: D1 }),
        findUnique: async ({ where }: any) => {
          if (where.id === "prj_1" || where.key === "somasmart") {
            return { id: "prj_1", key: "somasmart", name: "Soma Smart", status: "active", createdAt: D1, updatedAt: D1 };
          }
          return null;
        },
        findMany: async () => [
          { id: "prj_1", key: "somasmart", name: "Soma Smart", status: "active", createdAt: D1, updatedAt: D1 },
          { id: "prj_2", key: "zeta", name: "Zeta", status: "suspended", createdAt: D1, updatedAt: D2 }
        ],
        create: async ({ data }: any) => ({ ...data, createdAt: D1, updatedAt: D1 }),
        update: async ({ where, data }: any) => ({
          id: where.id,
          key: "somasmart",
          name: data.name,
          status: data.status,
          createdAt: D1,
          updatedAt: D2
        })
      },
      tenantUser: {
        upsert: async () => {
          calls.push("tenantUser.upsert");
          return {};
        }
      },
      platformAdminUser: {
        upsert: async () => {
          calls.push("platformAdminUser.upsert");
          return {};
        },
        findUnique: async ({ where }: any) => {
          if (where.username === "platformadmin" || where.id === "padm_1") {
            return { id: "padm_1", username: "platformadmin", passwordHash: "h", createdAt: D1, updatedAt: D1 };
          }
          return null;
        }
      },
      platformSession: {
        create: async ({ data }: any) => ({ ...data, revokedAt: null, createdAt: D1, updatedAt: D1 }),
        findUnique: async ({ where }: any) => {
          if (where.id === "psess_1") {
            return {
              id: "psess_1",
              platformAdminId: "padm_1",
              refreshHash: "h1",
              expiresAt: D2,
              revokedAt: null,
              createdAt: D1,
              updatedAt: D1
            };
          }
          return null;
        },
        update: async () => undefined
      }
    };

    const store = new PrismaStore(prisma as any);
    await store.ensureBootstrap();
    expect(calls).toEqual(["tenantUser.upsert", "platformAdminUser.upsert"]);

    expect((await store.getProjectById("prj_1"))?.key).toBe("somasmart");
    expect(await store.getProjectById("missing")).toBeNull();
    expect((await store.getProjectByKey(" SOMASMART "))?.id).toBe("prj_1");
    expect((await store.listProjects()).length).toBe(2);

    const created = await store.createProject({ key: "  Alpha ", name: " Alpha Project " });
    expect(created.key).toBe("alpha");

    const updated = await store.updateProject("prj_1", { name: " Renamed ", status: "archived" });
    expect(updated?.name).toBe("Renamed");
    expect(updated?.status).toBe("archived");

    expect((await store.findPlatformAdminByUsername(" PlatformAdmin "))?.id).toBe("padm_1");
    expect(await store.findPlatformAdminByUsername("none")).toBeNull();
    expect((await store.findPlatformAdminById("padm_1"))?.username).toBe("platformadmin");

    const session = await store.createPlatformSession({
      platformAdminId: "padm_1",
      refreshHash: "h1",
      expiresAt: D2.toISOString()
    });
    expect(session.id.startsWith("psess_")).toBe(true);

    expect((await store.findPlatformSessionById("psess_1"))?.id).toBe("psess_1");
    expect(await store.findPlatformSessionById("missing")).toBeNull();
    await expect(store.updatePlatformSession("missing", { revokedAt: D2.toISOString() })).resolves.toBeUndefined();
  });

  it("covers tenant user/session sync, checkpoints, blobs, jobs, audits, and offline ticket", async () => {
    const state: any = {
      tenantUserById: {
        usr_1: {
          id: "usr_1",
          projectId: "prj_1",
          username: "student",
          displayName: "Student",
          passwordHash: "h",
          role: "student",
          status: "active",
          createdAt: D1,
          updatedAt: D1,
          deletedAt: null
        }
      },
      tenantSessionById: {
        tsess_1: {
          id: "tsess_1",
          projectId: "prj_1",
          userId: "usr_1",
          refreshHash: "h",
          expiresAt: D2,
          revokedAt: null,
          offlineTicketHash: null,
          offlineTicketExpiresAt: null,
          createdAt: D1,
          updatedAt: D1
        }
      },
      checkpoints: new Map<string, number>(),
      blobs: new Map<string, any>(),
      jobs: new Map<string, any>(),
      audits: [] as any[],
      records: new Map<string, any>(),
      changes: [] as any[]
    };

    const tx = {
      syncRecord: {
        findUnique: async ({ where }: any) => state.records.get(`${where.projectId_entityType_entityId.projectId}:${where.projectId_entityType_entityId.entityType}:${where.projectId_entityType_entityId.entityId}`) ?? null,
        upsert: async ({ where, update, create }: any) => {
          const key = `${where.projectId_entityType_entityId.projectId}:${where.projectId_entityType_entityId.entityType}:${where.projectId_entityType_entityId.entityId}`;
          const prev = state.records.get(key);
          state.records.set(key, prev ? { ...prev, ...update } : { ...create });
          return state.records.get(key);
        }
      },
      changeLog: {
        findFirst: async () => (state.changes.length ? { seq: state.changes[state.changes.length - 1].seq } : null),
        create: async ({ data }: any) => {
          const row = { ...data, id: `chg_${state.changes.length + 1}` };
          state.changes.push(row);
          return row;
        }
      }
    };

    const prisma = {
      tenantUser: {
        findUnique: async ({ where }: any) => {
          if (where.projectId_username) {
            const byUsername = Object.values(state.tenantUserById).find(
              (u: any) => u.projectId === where.projectId_username.projectId && u.username === where.projectId_username.username
            );
            return byUsername ?? null;
          }
          return state.tenantUserById[where.id] ?? null;
        },
        create: async ({ data }: any) => ({ ...data, createdAt: D1, updatedAt: D1, deletedAt: null }),
        update: async ({ where, data }: any) => {
          const existing = state.tenantUserById[where.id] ?? { id: where.id, projectId: "prj_1", username: "student", displayName: "Student", passwordHash: "h", role: "student", createdAt: D1 };
          const next = { ...existing, ...data, updatedAt: D2 };
          state.tenantUserById[where.id] = next;
          return next;
        },
        findMany: async ({ where }: any) => Object.values(state.tenantUserById).filter((u: any) => u.projectId === where.projectId)
      },
      tenantSession: {
        create: async ({ data }: any) => ({ ...data, revokedAt: null, createdAt: D1, updatedAt: D1 }),
        findUnique: async ({ where }: any) => state.tenantSessionById[where.id] ?? null,
        update: async ({ where, data }: any) => {
          state.tenantSessionById[where.id] = { ...state.tenantSessionById[where.id], ...data, updatedAt: D2 };
          return state.tenantSessionById[where.id];
        }
      },
      syncBatch: {
        findUnique: async ({ where }: any) => (where.projectId_deviceId_batchId.batchId === "seen" ? { id: "bat_1" } : null),
        upsert: async () => ({})
      },
      syncEvent: {
        findUnique: async ({ where }: any) => (where.projectId_eventId.eventId === "seen_evt" ? { id: "evt_1" } : null),
        upsert: async () => ({})
      },
      changeLog: {
        findMany: async () => [
          { id: "chg_1", projectId: "prj_1", seq: 1, entityType: "users", entityId: "usr_1", op: "upsert", data: { a: 1 }, occurredAt: D1 }
        ],
        aggregate: async () => ({ _max: { seq: 5 } })
      },
      deviceCheckpoint: {
        findUnique: async ({ where }: any) => {
          const key = `${where.projectId_userId_deviceId_scope.projectId}:${where.projectId_userId_deviceId_scope.userId}:${where.projectId_userId_deviceId_scope.deviceId}:${where.projectId_userId_deviceId_scope.scope}`;
          return state.checkpoints.has(key) ? { cursor: state.checkpoints.get(key) } : null;
        },
        upsert: async ({ where, create, update }: any) => {
          const key = `${where.projectId_userId_deviceId_scope.projectId}:${where.projectId_userId_deviceId_scope.userId}:${where.projectId_userId_deviceId_scope.deviceId}:${where.projectId_userId_deviceId_scope.scope}`;
          state.checkpoints.set(key, update.cursor ?? create.cursor);
          return {};
        }
      },
      blobManifest: {
        upsert: async ({ where, create, update }: any) => {
          const key = `${where.projectId_cid.projectId}:${where.projectId_cid.cid}`;
          state.blobs.set(key, state.blobs.has(key) ? { ...state.blobs.get(key), ...update } : { ...create, createdAt: create.createdAt ?? D1 });
          return {};
        },
        findUnique: async ({ where }: any) => state.blobs.get(`${where.projectId_cid.projectId}:${where.projectId_cid.cid}`) ?? null,
        findMany: async ({ where }: any) => {
          const cids = where?.cid?.in ?? [];
          return cids.filter((cid: string) => state.blobs.has(`${where.projectId}:${cid}`)).map((cid: string) => ({ cid }));
        }
      },
      project: {
        findUnique: async ({ where }: any) => (where.id === "prj_1" ? { id: "prj_1", key: "k", name: "N", status: "active", createdAt: D1, updatedAt: D1 } : null)
      },
      syncRecord: {
        findMany: async () => [
          { entityType: "users", entityId: "usr_1", value: { role: "student" }, updatedAt: D1, deletedAt: null }
        ]
      },
      platformJob: {
        create: async ({ data }: any) => {
          const row = { ...data, id: "job_1", createdAt: D1, updatedAt: D1, result: null };
          state.jobs.set("job_1", row);
          return row;
        },
        findUnique: async ({ where }: any) => state.jobs.get(where.id) ?? null,
        update: async ({ where, data }: any) => {
          state.jobs.set(where.id, { ...state.jobs.get(where.id), ...data, updatedAt: D2 });
          return state.jobs.get(where.id);
        }
      },
      platformAuditLog: {
        create: async ({ data }: any) => {
          const row = { ...data, id: "audit_1", createdAt: D1 };
          state.audits.push(row);
          return row;
        },
        findMany: async ({ where }: any) => {
          if (!where) return state.audits;
          return state.audits.filter((a: any) => a.projectId === where.projectId);
        }
      },
      $transaction: async (fn: any) => fn(tx)
    };

    const store = new PrismaStore(prisma as any);

    expect(await store.findTenantUserByUsername("prj_1", "student")).not.toBeNull();
    expect(await store.findTenantUserByUsername("prj_1", "missing")).toBeNull();
    expect(await store.findTenantUserById("prj_1", "usr_1")).not.toBeNull();
    expect(await store.findTenantUserById("prj_other", "usr_1")).toBeNull();

    const createdUser = await store.createTenantUser({
      projectId: "prj_1",
      username: "NEW_USER",
      displayName: " New User ",
      passwordHash: "hash",
      role: "teacher"
    });
    expect(createdUser.username).toBe("new_user");

    const updatedStatus = await store.updateTenantUserStatus("prj_1", "usr_1", "suspended");
    expect(updatedStatus?.status).toBe("suspended");
    expect(await store.updateTenantUserStatus("prj_1", "usr_missing", "active")).toBeNull();

    const softDeleted = await store.softDeleteTenantUser("prj_1", "usr_1");
    expect(softDeleted?.deletedAt).toBeDefined();
    expect(await store.softDeleteTenantUser("prj_1", "usr_missing")).toBeNull();

    const tenantSession = await store.createTenantSession({
      projectId: "prj_1",
      userId: "usr_1",
      refreshHash: "h2",
      expiresAt: D2.toISOString()
    });
    expect(tenantSession.id.startsWith("tsess_")).toBe(true);

    expect(await store.findTenantSessionById("missing")).toBeNull();
    expect((await store.findTenantSessionById("tsess_1"))?.id).toBe("tsess_1");
    await store.updateTenantSession("tsess_1", { revokedAt: D2.toISOString(), offlineTicketExpiresAt: null });
    await expect(store.updateTenantSession("missing", { revokedAt: D2.toISOString() })).resolves.toBeUndefined();

    expect(await store.hasProcessedBatch("prj_1", "dev", "seen")).toBe(true);
    expect(await store.hasProcessedBatch("prj_1", "dev", "new")).toBe(false);
    await store.markProcessedBatch("prj_1", "dev", "new");

    expect(await store.hasProcessedEvent("prj_1", "seen_evt")).toBe(true);
    expect(await store.hasProcessedEvent("prj_1", "new_evt")).toBe(false);
    await store.markProcessedEvent("prj_1", "new_evt");

    const syncUpsert = await store.applySyncEvent("prj_1", {
      eventId: "evt_up",
      entityType: "progress",
      entityId: "p1",
      op: "upsert",
      data: { score: 90 }
    });
    expect(syncUpsert.projectId).toBe("prj_1");

    const syncDelete = await store.applySyncEvent("prj_1", {
      eventId: "evt_del",
      entityType: "progress",
      entityId: "p1",
      op: "delete",
      data: { reason: "cleanup" }
    });
    expect(syncDelete.op).toBe("delete");

    const pulled = await store.pullChanges("prj_1", 0, 20);
    expect(pulled[0].seq).toBe(1);
    expect(await store.getLastCursor("prj_1")).toBe(5);

    expect(
      await store.getCheckpoint({ projectId: "prj_1", userId: "usr_1", deviceId: "dev_1", scope: "default" })
    ).toBe(0);
    await store.setCheckpoint({ projectId: "prj_1", userId: "usr_1", deviceId: "dev_1", scope: "default", cursor: 12 });
    expect(
      await store.getCheckpoint({ projectId: "prj_1", userId: "usr_1", deviceId: "dev_1", scope: "default" })
    ).toBe(12);

    await store.upsertBlobManifest({ projectId: "prj_1", cid: "cid_1", mime: "text/plain", size: 3, bytes: Buffer.from("abc") });
    expect((await store.getBlobManifest("prj_1", "cid_1"))?.cid).toBe("cid_1");
    expect(await store.getBlobManifest("prj_1", "missing")).toBeNull();
    expect(await store.listMissingBlobs("prj_1", ["cid_1", "cid_2"])).toEqual(["cid_2"]);

    const exported = await store.exportProjectData("prj_1", ["users"]);
    expect(exported?.users.length).toBeGreaterThan(0);
    expect(await store.exportProjectData("missing", ["users"])).toBeNull();

    const mutated = await store.applyDataMutations("prj_1", [
      { type: "tenant.user.status.set", userId: "usr_1", status: "active" },
      { type: "tenant.user.soft_delete", userId: "usr_1" },
      { type: "tenant.record.upsert", entityType: "progress", entityId: "p2", data: { done: true } },
      { type: "unknown" } as any
    ]);
    expect(mutated.applied.length).toBe(3);
    expect(mutated.rejected.length).toBe(1);

    const mutatedMissingTargets = await store.applyDataMutations("prj_1", [
      { type: "tenant.user.status.set", userId: "usr_missing", status: "active" },
      { type: "tenant.user.soft_delete", userId: "usr_missing" }
    ]);
    expect(mutatedMissingTargets.applied.length).toBe(0);
    expect(mutatedMissingTargets.rejected.length).toBe(2);
    expect(mutatedMissingTargets.rejected.every((entry) => entry.code === "NOT_FOUND")).toBe(true);

    const exportedNoEntityFilter = await store.exportProjectData("prj_1");
    expect(exportedNoEntityFilter?.records.length).toBeGreaterThan(0);

    await store.upsertBlobManifest({ projectId: "prj_1", cid: "cid_2", mime: "application/octet-stream", size: 0 });
    const blobNoBytes = await store.getBlobManifest("prj_1", "cid_2");
    expect(blobNoBytes?.bytes).toBeUndefined();

    const job = await store.createPlatformJob({ projectId: "prj_1", kind: "data_reindex", payload: { targets: ["users"] } });
    expect(job.id).toBe("job_1");
    const jobWithoutPayload = await store.createPlatformJob({ projectId: "prj_1", kind: "data_reindex" });
    expect(jobWithoutPayload.payload).toBeUndefined();
    expect((await store.findPlatformJobById("job_1"))?.kind).toBe("data_reindex");
    expect(await store.findPlatformJobById("missing")).toBeNull();
    await store.updatePlatformJob("job_1", { status: "succeeded", result: { ok: true } });
    await store.updatePlatformJob("job_1", { status: "queued" });
    await expect(store.updatePlatformJob("missing", { status: "failed" as any })).resolves.toBeUndefined();

    const audit = await store.appendPlatformAudit({ actorAdminId: "padm_1", projectId: "prj_1", action: "x", traceId: "t1" });
    expect(audit.id).toBe("audit_1");
    await store.appendPlatformAudit({
      actorAdminId: "padm_1",
      projectId: "prj_1",
      action: "detailed",
      reasonCode: "ops",
      ticketRef: "INC-777",
      traceId: "t2",
      beforeState: { status: "before" },
      afterState: { status: "after" }
    });
    expect((await store.listPlatformAudits("prj_1")).length).toBe(2);

    expect(await store.createOfflineTicketForTenantSession("missing")).toBeNull();
    const ticket = await store.createOfflineTicketForTenantSession("tsess_1");
    expect(ticket?.startsWith("offtk_")).toBe(true);
  });

  it("normalizes create/lookup failures into domain errors", async () => {
    const prisma = {
      project: { create: async () => { throw new Error("constraint"); } },
      tenantUser: { create: async () => { throw new Error("constraint"); } }
    };
    const store = new PrismaStore(prisma as any);

    await expect(store.createProject({ key: "dup", name: "Dup" })).rejects.toThrow("PROJECT_KEY_EXISTS");
    await expect(
      store.createTenantUser({
        projectId: "prj_1",
        username: "dup_user",
        displayName: "Dup",
        passwordHash: "h",
        role: "student"
      })
    ).rejects.toThrow("USERNAME_EXISTS");
  });
});
