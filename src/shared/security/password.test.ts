import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/shared/security/password";

async function sha256Hex(input: string) {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

describe("password hashing", () => {
  it("hashes and verifies PBKDF2 hashes", async () => {
    const h = await hashPassword("secret123");
    expect(h.startsWith("pbkdf2$")).toBe(true);
    await expect(verifyPassword("secret123", h)).resolves.toEqual({ ok: true });
    await expect(verifyPassword("wrong", h)).resolves.toEqual({ ok: false });
  });

  it("verifies legacy SHA-256 and returns an upgraded hash", async () => {
    const legacy = await sha256Hex("pw");
    const res = await verifyPassword("pw", legacy);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect("upgradedHash" in res ? res.upgradedHash : undefined).toBeTruthy();
    }
  });

  it("rejects wrong legacy password and malformed PBKDF2 hashes", async () => {
    const legacy = await sha256Hex("pw");
    await expect(verifyPassword("wrong", legacy)).resolves.toEqual({ ok: false });

    await expect(verifyPassword("pw", "pbkdf2$60000$only_three_parts")).resolves.toEqual({ ok: false });
    await expect(verifyPassword("pw", "pbkdf2$nope$AA==$AA==")).resolves.toEqual({ ok: false });
    await expect(verifyPassword("pw", "pbkdf2$9999$AA==$AA==")).resolves.toEqual({ ok: false });
    await expect(verifyPassword("pw", "pbkdf2$60000$AA==$AAA=")).resolves.toEqual({ ok: false });
  });
});
