import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OutboxEvent } from "@/shared/types";
import { ApiSyncAdapter } from "@/shared/sync/api/ApiSyncAdapter";

const config = {
  baseUrl: "/api",
  deviceId: "test_device_01",
  projectKey: "somasmart"
};

const session = {
  token: "test_access_token",
  ensureShouldFail: false
};

vi.mock("@/shared/sync/config", () => ({
  getSyncApiBaseUrl: () => config.baseUrl,
  getSyncDeviceId: () => config.deviceId,
  getSyncProjectKey: () => config.projectKey
}));

vi.mock("@/shared/sync/api/syncApiSession", () => ({
  ensureSyncAccessToken: vi.fn(async () => {
    if (session.ensureShouldFail) throw new Error("missing sync auth profile");
    return session.token;
  }),
  clearSyncApiSession: vi.fn(() => {})
}));

function buildMessageEvent(id: string): OutboxEvent {
  return {
    id,
    type: "message_send",
    payload: {
      message: {
        id: "msg_1",
        fromUserId: "user_a",
        toUserId: "user_b",
        body: "Hello",
        createdAt: "2026-02-01T00:00:00.000Z",
        status: "queued"
      }
    },
    createdAt: "2026-02-01T00:00:00.000Z",
    syncStatus: "queued"
  };
}

describe("ApiSyncAdapter", () => {
  beforeEach(() => {
    config.baseUrl = "/api";
    config.deviceId = "test_device_01";
    config.projectKey = "somasmart";
    session.token = "test_access_token";
    session.ensureShouldFail = false;
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("pushes mapped entity records to /sync/push with auth header", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          replayed: false,
          accepted: ["evt_1_message"],
          rejected: [],
          serverWatermark: 1
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );

    const adapter = new ApiSyncAdapter();
    const result = await adapter.pushEvents([buildMessageEvent("evt_1")]);

    expect(result.ok).toBe(true);
    expect(result.pushedCount).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/sync/push");
    expect((init as RequestInit).method).toBe("POST");
    expect(((init as RequestInit).headers as Record<string, string>).authorization).toBe("Bearer test_access_token");
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body.projectKey).toBe("somasmart");
    expect(body.deviceId).toBe("test_device_01");
    expect(body.events).toHaveLength(1);
    expect(body.events[0].entityType).toBe("messages");
    expect(body.events[0].eventId).toBe("evt_1_message");
    expect(body.events[0].data.status).toBe("sent");
  });

  it("maps pull changes to typed bundle slices", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          scope: "default",
          changes: [
            {
              id: "chg_1",
              seq: 5,
              entityType: "users",
              entityId: "user_1",
              op: "upsert",
              data: {
                id: "user_1",
                role: "teacher",
                status: "active",
                displayName: "Teacher One",
                username: "teacher1",
                passwordHash: "hash",
                createdAt: "2026-01-01T00:00:00.000Z"
              },
              occurredAt: "2026-02-01T00:00:00.000Z"
            },
            {
              id: "chg_2",
              seq: 6,
              entityType: "messages",
              entityId: "msg_1",
              op: "upsert",
              data: {
                id: "msg_1",
                fromUserId: "user_1",
                toUserId: "user_2",
                body: "Hi",
                status: "sent",
                createdAt: "2026-02-01T00:00:00.000Z"
              },
              occurredAt: "2026-02-01T00:00:00.000Z"
            }
          ],
          nextCheckpoints: { default: 6 }
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );

    const adapter = new ApiSyncAdapter();
    const result = await adapter.pullChanges("4");

    expect(result.serverTime).toBe("6");
    expect(result.users?.[0]?.id).toBe("user_1");
    expect(result.messages?.[0]?.id).toBe("msg_1");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/sync/pull");
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body.checkpoints.default).toBe(4);
    expect(body.deviceId).toBe("test_device_01");
  });

  it("fails when sync api session cannot provide token", async () => {
    session.ensureShouldFail = true;
    const fetchMock = vi.mocked(fetch);
    const adapter = new ApiSyncAdapter();

    await expect(adapter.pullChanges()).rejects.toThrow("missing sync auth profile");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

