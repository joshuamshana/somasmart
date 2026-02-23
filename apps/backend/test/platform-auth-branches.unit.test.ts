import { describe, expect, it } from "vitest";
import { hashSecret } from "../core/lib/crypto.mjs";
import { registerPlatformAuthRoutes } from "../core/services/platformAuth.mjs";
import { signRawToken } from "../core/auth/tokens.mjs";

type RegisteredRoute = {
  method: "post";
  path: string;
  handler: (request: any, reply: any) => Promise<any>;
};

function createReplyCollector() {
  const state: { statusCode: number; body?: unknown } = { statusCode: 200 };
  return {
    state,
    status(code: number) {
      state.statusCode = code;
      return this;
    },
    send(payload?: unknown) {
      state.body = payload;
      return this;
    },
    async jwtSign(payload: Record<string, unknown>, options: { expiresIn: string }) {
      return signRawToken(payload, options.expiresIn);
    }
  };
}

async function setupAuthRoutes(deps: {
  store: Record<string, any>;
  jwt?: { verify: (token: string) => Promise<any> };
}) {
  const routes: RegisteredRoute[] = [];
  const app = {
    store: deps.store,
    jwt: deps.jwt ?? {
      async verify(token: string) {
        return signRawToken({ token }, "1m");
      }
    },
    post(path: string, handler: RegisteredRoute["handler"]) {
      routes.push({ method: "post", path, handler });
    }
  };

  await registerPlatformAuthRoutes(app as never);

  return {
    handler(path: string) {
      const route = routes.find((r) => r.path === path);
      if (!route) throw new Error(`route not found: ${path}`);
      return route.handler;
    }
  };
}

describe("platformAuth route branches", () => {
  it("covers refresh/login/logout error branches", async () => {
    process.env.JWT_SECRET = "unit-platform-auth-secret";

    const store = {
      async findPlatformAdminByUsername(username: string) {
        if (username !== "platform_admin") return null;
        return { id: "padm_1", username: "platform_admin", passwordHash: hashSecret("correct-password") };
      },
      async createPlatformSession() {
        return { id: "psess_1" };
      },
      async updatePlatformSession() {
        return undefined;
      },
      async findPlatformSessionById(id: string) {
        const future = new Date(Date.now() + 60_000).toISOString();
        if (id === "revoked") return { id, refreshHash: hashSecret("x"), revokedAt: new Date().toISOString(), expiresAt: future };
        if (id === "bad_hash") return { id, refreshHash: hashSecret("different-token"), expiresAt: future };
        if (id === "missing_admin") return { id, refreshHash: hashSecret(validRefreshMissingAdmin), expiresAt: future };
        if (id === "good") return { id, refreshHash: hashSecret(validRefreshGood), expiresAt: future };
        return null;
      },
      async findPlatformAdminById(id: string) {
        if (id === "padm_missing") return null;
        return { id, username: "platform_admin" };
      }
    };

    const validRefreshMissingAdmin = await signRawToken(
      { tokenClass: "platform_refresh", sid: "missing_admin", sub: "padm_missing", username: "platform_admin" },
      "15m"
    );
    const validRefreshGood = await signRawToken(
      { tokenClass: "platform_refresh", sid: "good", sub: "padm_1", username: "platform_admin" },
      "15m"
    );
    const accessToken = await signRawToken(
      { tokenClass: "platform_access", sid: "good", sub: "padm_1", username: "platform_admin" },
      "15m"
    );
    const tenantAccess = await signRawToken({ tokenClass: "tenant_access", sid: "t1", sub: "u1" }, "15m");

    const routes = await setupAuthRoutes({
      store,
      jwt: {
        async verify(token: string) {
          return (await import("../core/auth/jwt.mjs")).verifyJwtToken(token);
        }
      }
    });

    const loginBadPasswordReply = createReplyCollector();
    await routes.handler("/platform/auth/login")(
      { body: { username: "platform_admin", password: "wrong-password" } },
      loginBadPasswordReply
    );
    expect(loginBadPasswordReply.state.statusCode).toBe(401);

    const loginUnknownAdminReply = createReplyCollector();
    await routes.handler("/platform/auth/login")(
      { body: { username: "unknown_admin", password: "some-password-123" } },
      loginUnknownAdminReply
    );
    expect(loginUnknownAdminReply.state.statusCode).toBe(401);

    const refreshRevokedReply = createReplyCollector();
    const revokedToken = await signRawToken({ tokenClass: "platform_refresh", sid: "revoked", sub: "padm_1" }, "15m");
    await routes.handler("/platform/auth/refresh")({ body: { refreshToken: revokedToken } }, refreshRevokedReply);
    expect(refreshRevokedReply.state.statusCode).toBe(401);
    expect(refreshRevokedReply.state.body).toEqual({ code: "AUTH_SESSION_REVOKED" });

    const refreshHashMismatchReply = createReplyCollector();
    const hashMismatchToken = await signRawToken({ tokenClass: "platform_refresh", sid: "bad_hash", sub: "padm_1" }, "15m");
    await routes.handler("/platform/auth/refresh")({ body: { refreshToken: hashMismatchToken } }, refreshHashMismatchReply);
    expect(refreshHashMismatchReply.state.statusCode).toBe(401);
    expect(refreshHashMismatchReply.state.body).toEqual({ code: "AUTH_INVALID" });

    const refreshMissingAdminReply = createReplyCollector();
    await routes.handler("/platform/auth/refresh")({ body: { refreshToken: validRefreshMissingAdmin } }, refreshMissingAdminReply);
    expect(refreshMissingAdminReply.state.statusCode).toBe(401);

    const refreshSuccessReply = createReplyCollector();
    await routes.handler("/platform/auth/refresh")({ body: { refreshToken: validRefreshGood } }, refreshSuccessReply);
    expect(refreshSuccessReply.state.statusCode).toBe(200);
    expect((refreshSuccessReply.state.body as { refreshToken?: string }).refreshToken).toBeTruthy();

    const logoutForbiddenClassReply = createReplyCollector();
    await routes.handler("/platform/auth/logout")(
      { async jwtVerify() { return (await import("../core/auth/jwt.mjs")).verifyJwtToken(tenantAccess); } },
      logoutForbiddenClassReply
    );
    expect(logoutForbiddenClassReply.state.statusCode).toBe(403);

    const logoutSuccessReply = createReplyCollector();
    await routes.handler("/platform/auth/logout")(
      { async jwtVerify() { return (await import("../core/auth/jwt.mjs")).verifyJwtToken(accessToken); } },
      logoutSuccessReply
    );
    expect(logoutSuccessReply.state.statusCode).toBe(204);
  });
});
