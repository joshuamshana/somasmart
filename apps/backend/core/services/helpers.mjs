import { randomUUID } from "node:crypto";
import { expectPlatformAccess, expectTenantAccess, verifyAndExtract } from "../auth/tokens.mjs";
export async function requirePlatformAccess(request) {
    const payload = await verifyAndExtract(request);
    return expectPlatformAccess(payload);
}
export async function requireTenantAccess(request) {
    const payload = await verifyAndExtract(request);
    return expectTenantAccess(payload);
}
export function getTraceId(request) {
    const fromHeader = request.headers["x-trace-id"];
    if (typeof fromHeader === "string" && fromHeader.trim())
        return fromHeader.trim();
    return randomUUID();
}
