import type { FastifyInstance } from "fastify";
import { tenantLoginSchema, tenantRegisterSchema } from "../contracts";
import {
  expectTenantAccess,
  expectTenantRefresh,
  signTenantAccessToken,
  signTenantRefreshToken,
  verifyAndExtract
} from "../auth/tokens";
import { addDays } from "../utils/common";
import { hashSecret, verifySecret } from "../utils/crypto";

export async function registerTenantAuthRoutes(app: FastifyInstance) {
  app.post("/auth/register", async (request, reply) => {
    const parsed = tenantRegisterSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ code: "VALIDATION_FAILED", issues: parsed.error.issues });
    }

    const { projectKey, username, password, displayName } = parsed.data;
    const role = parsed.data.role ?? "student";
    const project = await app.store.getProjectByKey(projectKey);
    if (!project || project.status !== "active") {
      return reply.status(404).send({ code: "PROJECT_NOT_AVAILABLE" });
    }

    const existing = await app.store.findTenantUserByUsername(project.id, username);
    if (existing) {
      return reply.status(409).send({ code: "USERNAME_EXISTS" });
    }

    const user = await app.store.createTenantUser({
      projectId: project.id,
      username,
      displayName,
      passwordHash: hashSecret(password),
      role
    });

    return reply.status(201).send({
      user: {
        id: user.id,
        projectId: user.projectId,
        role: user.role,
        username: user.username,
        status: user.status,
        displayName: user.displayName
      }
    });
  });

  app.post("/auth/login", async (request, reply) => {
    const parsed = tenantLoginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ code: "VALIDATION_FAILED", issues: parsed.error.issues });
    }

    const { projectKey, username, password } = parsed.data;
    const project = await app.store.getProjectByKey(projectKey);
    if (!project || project.status !== "active") {
      return reply.status(404).send({ code: "PROJECT_NOT_AVAILABLE" });
    }

    const user = await app.store.findTenantUserByUsername(project.id, username);
    if (!user || user.deletedAt) {
      return reply.status(401).send({ code: "AUTH_INVALID" });
    }
    if (user.status === "suspended") {
      return reply.status(403).send({ code: "AUTH_SUSPENDED" });
    }

    const verified = verifySecret(password, user.passwordHash);
    if (!verified) {
      return reply.status(401).send({ code: "AUTH_INVALID" });
    }

    const session = await app.store.createTenantSession({
      projectId: project.id,
      userId: user.id,
      refreshHash: hashSecret("pending"),
      expiresAt: addDays(30)
    });

    const baseClaims = {
      sub: user.id,
      sid: session.id,
      projectId: project.id,
      projectKey: project.key,
      role: user.role,
      username: user.username
    };

    const accessToken = await signTenantAccessToken(reply, baseClaims);
    const refreshToken = await signTenantRefreshToken(reply, baseClaims);
    await app.store.updateTenantSession(session.id, { refreshHash: hashSecret(refreshToken), expiresAt: addDays(30) });

    const offlineTicket = await app.store.createOfflineTicketForTenantSession(session.id);

    return reply.send({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        projectId: project.id,
        projectKey: project.key
      },
      offlineEnrollment: offlineTicket
        ? {
            ticket: offlineTicket,
            expiresAt: addDays(30),
            mode: "pin_keystore"
          }
        : null
    });
  });

  app.post("/auth/refresh", async (request, reply) => {
    const body = request.body as { refreshToken?: string } | undefined;
    if (!body?.refreshToken) {
      return reply.status(400).send({ code: "REFRESH_TOKEN_REQUIRED" });
    }

    let payload: Record<string, unknown>;
    try {
      payload = (await app.jwt.verify(body.refreshToken)) as Record<string, unknown>;
    } catch {
      return reply.status(401).send({ code: "AUTH_INVALID" });
    }

    let claims;
    try {
      claims = expectTenantRefresh(payload);
    } catch {
      return reply.status(403).send({ code: "FORBIDDEN_TOKEN_CLASS" });
    }

    const session = await app.store.findTenantSessionById(claims.sid);
    if (!session || session.revokedAt) {
      return reply.status(401).send({ code: "AUTH_SESSION_REVOKED" });
    }
    if (!verifySecret(body.refreshToken, session.refreshHash)) {
      return reply.status(401).send({ code: "AUTH_INVALID" });
    }

    const user = await app.store.findTenantUserById(claims.projectId, claims.sub);
    const project = await app.store.getProjectById(claims.projectId);
    if (!project || !user || user.deletedAt || user.status === "suspended") {
      return reply.status(403).send({ code: "AUTH_NOT_ALLOWED" });
    }

    const baseClaims = {
      sub: user.id,
      sid: session.id,
      projectId: project.id,
      projectKey: project.key,
      role: user.role,
      username: user.username
    };
    const accessToken = await signTenantAccessToken(reply, baseClaims);
    const refreshToken = await signTenantRefreshToken(reply, baseClaims);

    await app.store.updateTenantSession(session.id, {
      refreshHash: hashSecret(refreshToken),
      expiresAt: addDays(30)
    });

    return reply.send({ accessToken, refreshToken });
  });

  app.post("/auth/logout", async (request, reply) => {
    let payload: Record<string, unknown>;
    try {
      payload = await verifyAndExtract(request);
    } catch {
      return reply.status(401).send({ code: "AUTH_INVALID" });
    }

    let claims;
    try {
      claims = expectTenantAccess(payload);
    } catch {
      return reply.status(403).send({ code: "FORBIDDEN_TOKEN_CLASS" });
    }

    await app.store.updateTenantSession(claims.sid, { revokedAt: new Date().toISOString() });
    return reply.status(204).send();
  });

  app.post("/auth/offline/enroll", async (request, reply) => {
    let payload: Record<string, unknown>;
    try {
      payload = await verifyAndExtract(request);
    } catch {
      return reply.status(401).send({ code: "AUTH_INVALID" });
    }

    let claims;
    try {
      claims = expectTenantAccess(payload);
    } catch {
      return reply.status(403).send({ code: "FORBIDDEN_TOKEN_CLASS" });
    }

    const ticket = await app.store.createOfflineTicketForTenantSession(claims.sid);
    if (!ticket) {
      return reply.status(404).send({ code: "SESSION_NOT_FOUND" });
    }

    return reply.status(201).send({
      ticket,
      expiresAt: addDays(30),
      mode: "pin_keystore"
    });
  });

  app.get("/auth/me", async (request, reply) => {
    let payload: Record<string, unknown>;
    try {
      payload = await verifyAndExtract(request);
    } catch {
      return reply.status(401).send({ code: "AUTH_INVALID" });
    }

    let claims;
    try {
      claims = expectTenantAccess(payload);
    } catch {
      return reply.status(403).send({ code: "FORBIDDEN_TOKEN_CLASS" });
    }

    const user = await app.store.findTenantUserById(claims.projectId, claims.sub);
    if (!user) return reply.status(404).send({ code: "USER_NOT_FOUND" });

    return reply.send({
      id: user.id,
      projectId: claims.projectId,
      projectKey: claims.projectKey,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      status: user.status
    });
  });
}
