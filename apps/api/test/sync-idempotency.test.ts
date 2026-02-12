import { afterEach, describe, expect, it } from "vitest";
import { setupTestApp, tenantRegisterAndLogin } from "./helpers";

describe("sync idempotency", () => {
  let app: Awaited<ReturnType<typeof setupTestApp>> | null = null;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
  });

  it("replays same batch as idempotent and does not duplicate changes", async () => {
    app = await setupTestApp();
    const tenant = await tenantRegisterAndLogin(app, { username: "sync_student" });

    const payload = {
      deviceId: "device_sync",
      batchId: "batch_1",
      events: [
        {
          eventId: "evt_1",
          entityType: "progress",
          entityId: "progress_1",
          op: "upsert",
          data: { lessonId: "lesson_1", completed: true }
        }
      ]
    };

    const firstPush = await app.inject({
      method: "POST",
      url: "/sync/push",
      headers: { authorization: `Bearer ${tenant.accessToken}` },
      payload
    });
    expect(firstPush.statusCode).toBe(200);
    expect((firstPush.json() as { replayed: boolean; accepted: string[] }).replayed).toBe(false);

    const secondPush = await app.inject({
      method: "POST",
      url: "/sync/push",
      headers: { authorization: `Bearer ${tenant.accessToken}` },
      payload
    });
    expect(secondPush.statusCode).toBe(200);
    const replay = secondPush.json() as { replayed: boolean; accepted: string[] };
    expect(replay.replayed).toBe(true);
    expect(replay.accepted.length).toBe(0);
  });
});
