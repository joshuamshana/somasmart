export function getServerId() {
  if (typeof window === "undefined") return null;
  try {
    const url = new URL(window.location.href);
    const server = url.searchParams.get("server")?.trim();
    if (!server) return null;
    // Allow longer IDs so Playwright tests can safely generate unique server namespaces.
    // Still sanitize to prevent bad IndexedDB/localStorage keys.
    const safe = server.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
    return safe || null;
  } catch {
    return null;
  }
}
