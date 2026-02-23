import { afterEach, describe, expect, it } from "vitest";
import {
  blobNeedSchema,
  dataMutationOpSchema,
  platformAuthLoginSchema,
  platformProjectPatchSchema,
  syncPullSchema,
  syncPushSchema
} from "../core/contracts.mjs";
import { internalErrorBody, validationFailedBody } from "../core/errors.mjs";
import {
  getRequestPath,
  getTraceId as getHttpTraceId,
  normalizePath,
  sendInternalError,
  toHeaderMap
} from "../core/httpResponse.mjs";
import { addDays, newId, nowIso } from "../core/lib/common.mjs";
import { hashSecret, randomToken, verifySecret } from "../core/lib/crypto.mjs";
import {
  expectPlatformAccess,
  expectPlatformRefresh,
  expectTenantAccess,
  expectTenantRefresh
} from "../core/auth/claims.mjs";
import {
  getBearerToken,
  signJwtToken,
  verifyBearerFromHeaders,
  verifyJwtToken
} from "../core/auth/jwt.mjs";
import {
  signPlatformAccessToken,
  signPlatformRefreshToken,
  signRawToken,
  signTenantAccessToken,
  signTenantRefreshToken
} from "../core/auth/tokens.mjs";
import { getBootstrapSeedConfig } from "../core/config/bootstrap.mjs";
import { getTraceId as getServiceTraceId, requirePlatformAccess, requireTenantAccess } from "../core/services/helpers.mjs";
import { PrismaStore } from "../core/data/prismaStore.mjs";
import "../core/data/store.mjs";
import "../core/types.mjs";

describe("core contracts and utility modules", () => {
  const envSnapshot = { ...process.env };

  afterEach(() => {
    process.env = { ...envSnapshot };
  });

  it("validates contract schemas and mutation envelopes", () => {
    expect(platformAuthLoginSchema.safeParse({ username: "admin", password: "password123" }).success).toBe(true);
    expect(platformAuthLoginSchema.safeParse({ username: "x", password: "short" }).success).toBe(false);

    expect(platformProjectPatchSchema.safeParse({}).success).toBe(false);
    expect(platformProjectPatchSchema.safeParse({ status: "active" }).success).toBe(true);

    expect(
      dataMutationOpSchema.safeParse({ type: "tenant.user.status.set", userId: "usr_1", status: "suspended" }).success
    ).toBe(true);
    expect(dataMutationOpSchema.safeParse({ type: "unknown" }).success).toBe(false);

    expect(
      syncPushSchema.safeParse({
        deviceId: "dev_1",
        batchId: "batch_1",
        events: [{ eventId: "evt_1", entityType: "progress", entityId: "p1", op: "upsert", data: {} }]
      }).success
    ).toBe(true);

    const parsedPull = syncPullSchema.parse({ deviceId: "dev_1" });
    expect(parsedPull.checkpoints).toEqual({});
    expect(blobNeedSchema.safeParse({ cids: ["cid_1"] }).success).toBe(true);
  });

  it("returns expected error and http helper behavior", () => {
    expect(internalErrorBody()).toEqual({ code: "INTERNAL_ERROR", message: "Unexpected server error." });
    expect(validationFailedBody([{ field: "x" }])).toEqual({ code: "VALIDATION_FAILED", issues: [{ field: "x" }] });

    expect(getRequestPath({ path: "/sync/pull" })).toBe("/sync/pull");
    expect(getRequestPath({ originalUrl: "/sync/pull?x=1" })).toBe("/sync/pull");
    expect(getRequestPath({ url: "/auth/me?hello=1" })).toBe("/auth/me");
    expect(normalizePath("/auth/me///")).toBe("/auth/me");
    expect(normalizePath("")).toBe("/");

    const mapped = toHeaderMap({ Authorization: "Bearer a", "x-trace-id": ["trace-1"], "x-num": 42 });
    expect(mapped.authorization).toBe("Bearer a");
    expect(mapped["x-trace-id"]).toBe("trace-1");
    expect(mapped["x-num"]).toBe("42");

    const sent: { status?: number; payload?: unknown } = {};
    const res = {
      status(code: number) {
        sent.status = code;
        return this;
      },
      json(payload: unknown) {
        sent.payload = payload;
        return this;
      }
    };
    sendInternalError(res as never);
    expect(sent.status).toBe(500);
    expect(sent.payload).toEqual({ code: "INTERNAL_ERROR", message: "Unexpected server error." });

    expect(getHttpTraceId({ headers: { "x-trace-id": "trace_http" } })).toBe("trace_http");
    expect(getHttpTraceId({ headers: {} })).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it("covers common, crypto, claims and jwt/token helpers", async () => {
    const now = nowIso();
    expect(now).toContain("T");
    expect(addDays(1)).toContain("T");
    expect(newId("abc")).toMatch(/^abc_/);

    const hashed = hashSecret("secret-1");
    expect(hashed.startsWith("pbkdf2$")).toBe(true);
    expect(verifySecret("secret-1", hashed)).toBe(true);
    expect(verifySecret("secret-2", hashed)).toBe(false);
    expect(verifySecret("secret-1", "invalid")).toBe(false);
    expect(randomToken(24)).toBeTruthy();

    const tenantPayload = { tokenClass: "tenant_access", sub: "u1" };
    expect(expectTenantAccess(tenantPayload as never)).toEqual(tenantPayload);
    expect(() => expectTenantRefresh(tenantPayload as never)).toThrow("INVALID_TOKEN_CLASS_TENANT_REFRESH");

    const platformPayload = { tokenClass: "platform_access", sub: "p1" };
    expect(expectPlatformAccess(platformPayload as never)).toEqual(platformPayload);
    expect(() => expectPlatformRefresh(platformPayload as never)).toThrow("INVALID_TOKEN_CLASS_PLATFORM_REFRESH");

    process.env.JWT_SECRET = "jwt-test-secret";
    const rawToken = await signJwtToken({ sub: "abc", tokenClass: "tenant_access" }, "15m");
    const verifiedRaw = await verifyJwtToken(rawToken);
    expect(verifiedRaw.sub).toBe("abc");

    const replyCalls: Array<{ payload: Record<string, unknown>; expiresIn: string }> = [];
    const fakeReply = {
      async jwtSign(payload: Record<string, unknown>, options: { expiresIn: string }) {
        replyCalls.push({ payload, expiresIn: options.expiresIn });
        return `tok_${options.expiresIn}`;
      }
    };

    expect(await signTenantAccessToken(fakeReply as never, { sub: "u1" })).toBe("tok_15m");
    expect(await signTenantRefreshToken(fakeReply as never, { sub: "u1" })).toBe("tok_30d");
    expect(await signPlatformAccessToken(fakeReply as never, { sub: "p1" })).toBe("tok_15m");
    expect(await signPlatformRefreshToken(fakeReply as never, { sub: "p1" })).toBe("tok_30d");
    expect(replyCalls).toHaveLength(4);
    expect(replyCalls[0].payload.tokenClass).toBe("tenant_access");
    expect(replyCalls[1].payload.tokenClass).toBe("tenant_refresh");
    expect(replyCalls[3].payload.tokenClass).toBe("platform_refresh");

    const bearer = getBearerToken({ authorization: `Bearer ${rawToken}` });
    expect(bearer).toBe(rawToken);
    expect(getBearerToken({ authorization: "Token x" })).toBeNull();

    const verifiedFromHeader = await verifyBearerFromHeaders({ authorization: `Bearer ${rawToken}` });
    expect(verifiedFromHeader.sub).toBe("abc");
    await expect(verifyBearerFromHeaders({ authorization: "Bearer invalid" })).rejects.toThrow("AUTH_INVALID");
    await expect(verifyBearerFromHeaders({})).rejects.toThrow("AUTH_INVALID");

    const direct = await signRawToken({ sub: "direct" }, "5m");
    expect(typeof direct).toBe("string");
  });

  it("enforces bootstrap env requirements and service access helpers", async () => {
    process.env.SEED_PROJECT_KEY = "SOMASMART";
    process.env.SEED_PROJECT_NAME = "Soma";
    process.env.SEED_TENANT_ADMIN_USERNAME = "Admin";
    process.env.SEED_TENANT_ADMIN_PASSWORD = "secret1234";
    process.env.SEED_PLATFORM_ADMIN_USERNAME = "Platform";
    process.env.SEED_PLATFORM_ADMIN_PASSWORD = "secret9999";

    const seed = getBootstrapSeedConfig();
    expect(seed.projectKey).toBe("somasmart");
    expect(seed.platformAdminUsername).toBe("platform");

    delete process.env.SEED_PLATFORM_ADMIN_PASSWORD;
    expect(() => getBootstrapSeedConfig()).toThrow("Missing required seed env vars");

    const tenantReq = { jwtVerify: async () => ({ tokenClass: "tenant_access", sub: "u1" }) };
    const tenantClaims = await requireTenantAccess(tenantReq as never);
    expect(tenantClaims.sub).toBe("u1");

    const platformReq = { jwtVerify: async () => ({ tokenClass: "platform_access", sub: "p1" }) };
    const platformClaims = await requirePlatformAccess(platformReq as never);
    expect(platformClaims.sub).toBe("p1");

    const traceFromHeader = getServiceTraceId({ headers: { "x-trace-id": "trace_srv" } } as never);
    expect(traceFromHeader).toBe("trace_srv");
    expect(getServiceTraceId({ headers: {} } as never)).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it("covers key PrismaStore branches with a mock prisma client", async () => {
    const prisma = {
      project: {
        findUnique: async ({ where }: { where: { key?: string; id?: string } }) => {
          if (where.key === "projectkey") {
            return {
              id: "prj_1",
              key: "projectkey",
              name: "Project Key",
              status: "active",
              createdAt: new Date("2024-01-01T00:00:00.000Z"),
              updatedAt: new Date("2024-01-01T00:00:00.000Z")
            };
          }
          return null;
        },
        create: async () => {
          throw new Error("dup");
        }
      },
      platformSession: {
        findUnique: async () => null,
        update: async () => undefined
      },
      blobManifest: {
        findMany: async () => [{ cid: "cid_1" }]
      },
      tenantSession: {
        findUnique: async () => null
      }
    };

    const store = new PrismaStore(prisma as never);

    const project = await store.getProjectByKey(" ProjectKey ");
    expect(project?.key).toBe("projectkey");

    await expect(store.createProject({ key: "A", name: "A" })).rejects.toThrow("PROJECT_KEY_EXISTS");

    await expect(store.updatePlatformSession("missing", { revokedAt: new Date().toISOString() })).resolves.toBeUndefined();

    const missing = await store.listMissingBlobs("prj_1", ["cid_1", "cid_2"]);
    expect(missing).toEqual(["cid_2"]);
    expect(await store.listMissingBlobs("prj_1", [])).toEqual([]);

    expect(await store.createOfflineTicketForTenantSession("missing")).toBeNull();
  });
});
