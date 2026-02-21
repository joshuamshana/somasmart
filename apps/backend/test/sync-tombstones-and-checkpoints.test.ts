import { afterEach, describe, expect, it } from "vitest";
import { setupTestApp, tenantRegisterAndLogin } from "./helpers";

describe("sync tombstones and checkpoints", () => {
  let app: Awaited<ReturnType<typeof setupTestApp>> | null = null;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
  });

  it("returns tombstones and honors per-device checkpoints", async () => {
    app = await setupTestApp();
    const tenant = await tenantRegisterAndLogin(app, { username: "checkpoint_student" });

    const push = await app.inject({
      method: "POST",
      url: "/sync/push",
      headers: { authorization: `Bearer ${tenant.accessToken}` },
      payload: {
        deviceId: "device_a",
        batchId: "batch_tombstone_1",
        events: [
          {
            eventId: "evt_upsert_1",
            entityType: "lesson_progress",
            entityId: "progress_1",
            op: "upsert",
            data: { score: 72 }
          },
          {
            eventId: "evt_delete_1",
            entityType: "lesson_progress",
            entityId: "progress_1",
            op: "delete",
            data: { reason: "cleanup" }
          }
        ]
      }
    });
    expect(push.statusCode).toBe(200);

    const firstPull = await app.inject({
      method: "POST",
      url: "/sync/pull",
      headers: { authorization: `Bearer ${tenant.accessToken}` },
      payload: {
        deviceId: "device_a",
        checkpoints: { default: 0 }
      }
    });
    expect(firstPull.statusCode).toBe(200);
    const firstBody = firstPull.json() as {
      changes: Array<{ eventId?: string; op: "upsert" | "delete"; entityId: string }>;
      nextCheckpoints: { default: number };
    };

    const progressChanges = firstBody.changes.filter((change) => change.entityId === "progress_1");
    expect(progressChanges.length).toBe(2);
    expect(progressChanges.some((change) => change.op === "delete" && change.entityId === "progress_1")).toBe(true);
    expect(firstBody.nextCheckpoints.default).toBeGreaterThan(0);

    const secondPullSameDevice = await app.inject({
      method: "POST",
      url: "/sync/pull",
      headers: { authorization: `Bearer ${tenant.accessToken}` },
      payload: {
        deviceId: "device_a",
        checkpoints: {}
      }
    });
    expect(secondPullSameDevice.statusCode).toBe(200);
    const secondBody = secondPullSameDevice.json() as { changes: unknown[]; nextCheckpoints: { default: number } };
    expect(secondBody.changes.length).toBe(0);

    const pullDifferentDevice = await app.inject({
      method: "POST",
      url: "/sync/pull",
      headers: { authorization: `Bearer ${tenant.accessToken}` },
      payload: {
        deviceId: "device_b",
        checkpoints: {}
      }
    });
    expect(pullDifferentDevice.statusCode).toBe(200);
    const differentBody = pullDifferentDevice.json() as { changes: unknown[] };
    expect(differentBody.changes.length).toBeGreaterThan(0);
  });
});
