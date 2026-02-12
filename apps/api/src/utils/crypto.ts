import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

const PBKDF2_ROUNDS = 210_000;
const KEY_LEN = 32;
const DIGEST = "sha256";

export function hashSecret(value: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(value, salt, PBKDF2_ROUNDS, KEY_LEN, DIGEST).toString("hex");
  return `pbkdf2$${PBKDF2_ROUNDS}$${salt}$${hash}`;
}

export function verifySecret(value: string, stored: string) {
  const [scheme, roundsStr, salt, expectedHash] = stored.split("$");
  if (scheme !== "pbkdf2" || !roundsStr || !salt || !expectedHash) return false;
  const rounds = Number(roundsStr);
  if (!Number.isFinite(rounds) || rounds < 1) return false;

  const derived = pbkdf2Sync(value, salt, rounds, KEY_LEN, DIGEST);
  const expected = Buffer.from(expectedHash, "hex");
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

export function randomToken(size = 32) {
  return randomBytes(size).toString("base64url");
}
