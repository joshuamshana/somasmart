import type { FastifyReply, FastifyRequest } from "fastify";
import { randomUUID } from "node:crypto";
import type { PlatformAdminClaims, TenantClaims } from "../types";

export async function signTenantAccessToken(
  reply: FastifyReply,
  claims: Omit<TenantClaims, "tokenClass">
) {
  return reply.jwtSign({ ...claims, tokenClass: "tenant_access" }, { expiresIn: "15m" });
}

export async function signTenantRefreshToken(
  reply: FastifyReply,
  claims: Omit<TenantClaims, "tokenClass"> & { sid: string }
) {
  return reply.jwtSign(
    { ...claims, tokenClass: "tenant_refresh", refreshNonce: randomUUID() },
    { expiresIn: "30d" }
  );
}

export async function signPlatformAccessToken(
  reply: FastifyReply,
  claims: Omit<PlatformAdminClaims, "tokenClass">
) {
  return reply.jwtSign({ ...claims, tokenClass: "platform_access" }, { expiresIn: "15m" });
}

export async function signPlatformRefreshToken(
  reply: FastifyReply,
  claims: Omit<PlatformAdminClaims, "tokenClass"> & { sid: string }
) {
  return reply.jwtSign(
    { ...claims, tokenClass: "platform_refresh", refreshNonce: randomUUID() },
    { expiresIn: "30d" }
  );
}

export async function verifyAndExtract(request: FastifyRequest) {
  return (await request.jwtVerify()) as Record<string, unknown>;
}

export function expectTenantAccess(payload: Record<string, unknown>) {
  if (payload.tokenClass !== "tenant_access") {
    throw new Error("INVALID_TOKEN_CLASS_TENANT");
  }
  return payload as unknown as TenantClaims;
}

export function expectTenantRefresh(payload: Record<string, unknown>) {
  if (payload.tokenClass !== "tenant_refresh") {
    throw new Error("INVALID_TOKEN_CLASS_TENANT_REFRESH");
  }
  return payload as unknown as TenantClaims;
}

export function expectPlatformAccess(payload: Record<string, unknown>) {
  if (payload.tokenClass !== "platform_access") {
    throw new Error("INVALID_TOKEN_CLASS_PLATFORM");
  }
  return payload as unknown as PlatformAdminClaims;
}

export function expectPlatformRefresh(payload: Record<string, unknown>) {
  if (payload.tokenClass !== "platform_refresh") {
    throw new Error("INVALID_TOKEN_CLASS_PLATFORM_REFRESH");
  }
  return payload as unknown as PlatformAdminClaims;
}
