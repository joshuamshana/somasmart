import { platformAuthLoginSchema } from "../contracts.mjs";
import { expectPlatformAccess, expectPlatformRefresh, signPlatformAccessToken, signPlatformRefreshToken, verifyAndExtract } from "../auth/tokens.mjs";
import { addDays } from "../lib/common.mjs";
import { hashSecret, verifySecret } from "../lib/crypto.mjs";

function isExpired(isoTimestamp) {
    const ms = Date.parse(String(isoTimestamp || ""));
    return !Number.isFinite(ms) || ms <= Date.now();
}

export async function registerPlatformAuthRoutes(app) {
    app.post("/platform/auth/login", async (request, reply) => {
        const parsed = platformAuthLoginSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({ code: "VALIDATION_FAILED", issues: parsed.error.issues });
        }
        const { username, password } = parsed.data;
        const admin = await app.store.findPlatformAdminByUsername(username);
        if (!admin) {
            return reply.status(401).send({ code: "AUTH_INVALID" });
        }
        const verified = verifySecret(password, admin.passwordHash);
        if (!verified) {
            return reply.status(401).send({ code: "AUTH_INVALID" });
        }
        const session = await app.store.createPlatformSession({
            platformAdminId: admin.id,
            refreshHash: hashSecret("pending"),
            expiresAt: addDays(30)
        });
        const baseClaims = {
            sub: admin.id,
            sid: session.id,
            username: admin.username
        };
        const accessToken = await signPlatformAccessToken(reply, baseClaims);
        const refreshToken = await signPlatformRefreshToken(reply, baseClaims);
        await app.store.updatePlatformSession(session.id, {
            refreshHash: hashSecret(refreshToken),
            expiresAt: addDays(30)
        });
        return reply.send({ accessToken, refreshToken, admin: { id: admin.id, username: admin.username } });
    });
    app.post("/platform/auth/refresh", async (request, reply) => {
        const body = request.body;
        if (!body?.refreshToken) {
            return reply.status(400).send({ code: "REFRESH_TOKEN_REQUIRED" });
        }
        let payload;
        try {
            payload = (await app.jwt.verify(body.refreshToken));
        }
        catch {
            return reply.status(401).send({ code: "AUTH_INVALID" });
        }
        let claims;
        try {
            claims = expectPlatformRefresh(payload);
        }
        catch {
            return reply.status(403).send({ code: "FORBIDDEN_TOKEN_CLASS" });
        }
        const session = await app.store.findPlatformSessionById(claims.sid);
        if (!session || session.revokedAt) {
            return reply.status(401).send({ code: "AUTH_SESSION_REVOKED" });
        }
        if (isExpired(session.expiresAt)) {
            return reply.status(401).send({ code: "AUTH_SESSION_EXPIRED" });
        }
        if (!verifySecret(body.refreshToken, session.refreshHash)) {
            return reply.status(401).send({ code: "AUTH_INVALID" });
        }
        const admin = await app.store.findPlatformAdminById(claims.sub);
        if (!admin) {
            return reply.status(401).send({ code: "AUTH_INVALID" });
        }
        const baseClaims = {
            sub: admin.id,
            sid: session.id,
            username: admin.username
        };
        const accessToken = await signPlatformAccessToken(reply, baseClaims);
        const refreshToken = await signPlatformRefreshToken(reply, baseClaims);
        await app.store.updatePlatformSession(session.id, {
            refreshHash: hashSecret(refreshToken),
            expiresAt: addDays(30)
        });
        return reply.send({ accessToken, refreshToken });
    });
    app.post("/platform/auth/logout", async (request, reply) => {
        let payload;
        try {
            payload = await verifyAndExtract(request);
        }
        catch {
            return reply.status(401).send({ code: "AUTH_INVALID" });
        }
        let claims;
        try {
            claims = expectPlatformAccess(payload);
        }
        catch {
            return reply.status(403).send({ code: "FORBIDDEN_TOKEN_CLASS" });
        }
        await app.store.updatePlatformSession(claims.sid, { revokedAt: new Date().toISOString() });
        return reply.status(204).send();
    });
}
