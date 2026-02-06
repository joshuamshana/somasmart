export function isSafeInternalNext(next: string): boolean {
  const raw = String(next ?? "").trim();
  if (!raw) return false;
  if (!raw.startsWith("/")) return false;
  if (raw.startsWith("//")) return false;
  // Block obvious scheme-based open redirects, e.g. "/\\evil.com" is still a path, but "http:" should not appear.
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)) return false;
  return true;
}

export function getSafeNextFromSearch(search: string): string | null {
  try {
    const s = search?.startsWith("?") ? search : search ? `?${search}` : "";
    const params = new URLSearchParams(s);
    const next = params.get("next") ?? "";
    if (!isSafeInternalNext(next)) return null;
    return next;
  } catch {
    return null;
  }
}

