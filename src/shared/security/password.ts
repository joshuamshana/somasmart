const PBKDF2_PREFIX = "pbkdf2$";
const DEFAULT_ITERATIONS = 60_000;
const SALT_BYTES = 16;
const DERIVED_BITS = 256;

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function base64ToBytes(b64: string) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(password: string) {
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(new Uint8Array(digest));
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number) {
  const saltBytes = Uint8Array.from(salt);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBytes, iterations, hash: "SHA-256" },
    keyMaterial,
    DERIVED_BITS
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const derived = await pbkdf2(password, salt, DEFAULT_ITERATIONS);
  return `${PBKDF2_PREFIX}${DEFAULT_ITERATIONS}$${bytesToBase64(salt)}$${bytesToBase64(derived)}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  if (!storedHash.startsWith(PBKDF2_PREFIX)) {
    const legacy = await sha256Hex(password);
    const ok = legacy === storedHash;
    if (!ok) return { ok: false as const };
    const upgradedHash = await hashPassword(password);
    return { ok: true as const, upgradedHash };
  }

  const parts = storedHash.split("$");
  if (parts.length !== 4) return { ok: false as const };
  const iterations = Number(parts[1]);
  if (!Number.isFinite(iterations) || iterations < 10_000) return { ok: false as const };
  const salt = base64ToBytes(parts[2]);
  const expected = base64ToBytes(parts[3]);
  const derived = await pbkdf2(password, salt, iterations);

  if (derived.length !== expected.length) return { ok: false as const };
  let diff = 0;
  for (let i = 0; i < derived.length; i++) diff |= derived[i] ^ expected[i];
  return diff === 0 ? ({ ok: true as const } as const) : ({ ok: false as const } as const);
}
