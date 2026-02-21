import { createSecretKey } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';

const DEFAULT_JWT_SECRET = 'dev-only-jwt-secret-change-me';
const encoder = new TextEncoder();

function getJwtSecretKey() {
  const secret = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
  return createSecretKey(encoder.encode(secret));
}

export async function signJwtToken(payload, expiresIn) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getJwtSecretKey());
}

export async function verifyJwtToken(token) {
  const { payload } = await jwtVerify(token, getJwtSecretKey());
  return payload;
}

export function getBearerToken(headers) {
  const raw = headers?.authorization || headers?.Authorization;
  if (typeof raw !== 'string') return null;
  const [scheme, token] = raw.split(' ');
  if (!scheme || !token) return null;
  if (scheme.toLowerCase() !== 'bearer') return null;
  return token.trim() || null;
}

export async function verifyBearerFromHeaders(headers) {
  const token = getBearerToken(headers);
  if (!token) {
    throw new Error('AUTH_INVALID');
  }
  try {
    return await verifyJwtToken(token);
  } catch {
    throw new Error('AUTH_INVALID');
  }
}
