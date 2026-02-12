import type { FastifyRequest } from "fastify";
import { randomUUID } from "node:crypto";
import { expectPlatformAccess, expectTenantAccess, verifyAndExtract } from "../auth/tokens";

export async function requirePlatformAccess(request: FastifyRequest) {
  const payload = await verifyAndExtract(request);
  return expectPlatformAccess(payload);
}

export async function requireTenantAccess(request: FastifyRequest) {
  const payload = await verifyAndExtract(request);
  return expectTenantAccess(payload);
}

export function getTraceId(request: FastifyRequest) {
  const fromHeader = request.headers["x-trace-id"];
  if (typeof fromHeader === "string" && fromHeader.trim()) return fromHeader.trim();
  return randomUUID();
}
