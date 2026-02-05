export function getServerId() {
  if (typeof window === "undefined") return null;
  try {
    const url = new URL(window.location.href);
    const server = url.searchParams.get("server")?.trim();
    if (!server) return null;
    const safe = server.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32);
    return safe || null;
  } catch {
    return null;
  }
}

