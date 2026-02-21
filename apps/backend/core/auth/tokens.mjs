import { randomUUID } from 'node:crypto';
import { signJwtToken } from './jwt.mjs';
import {
  expectPlatformAccess,
  expectPlatformRefresh,
  expectTenantAccess,
  expectTenantRefresh
} from './claims.mjs';

export { expectTenantAccess, expectTenantRefresh, expectPlatformAccess, expectPlatformRefresh };

export async function signTenantAccessToken(reply, claims) {
  return reply.jwtSign({ ...claims, tokenClass: 'tenant_access' }, { expiresIn: '15m' });
}

export async function signTenantRefreshToken(reply, claims) {
  return reply.jwtSign(
    { ...claims, tokenClass: 'tenant_refresh', refreshNonce: randomUUID() },
    { expiresIn: '30d' }
  );
}

export async function signPlatformAccessToken(reply, claims) {
  return reply.jwtSign({ ...claims, tokenClass: 'platform_access' }, { expiresIn: '15m' });
}

export async function signPlatformRefreshToken(reply, claims) {
  return reply.jwtSign(
    { ...claims, tokenClass: 'platform_refresh', refreshNonce: randomUUID() },
    { expiresIn: '30d' }
  );
}

export async function verifyAndExtract(request) {
  return request.jwtVerify();
}

export async function signRawToken(payload, expiresIn) {
  return signJwtToken(payload, expiresIn);
}
