export function isSafeInternalNext(next: string): boolean {
  const raw = String(next ?? "").trim();
  if (!raw) return false;
  if (!raw.startsWith("/")) return false;
  if (raw.startsWith("//")) return false;
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
