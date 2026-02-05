export function getDeviceId() {
  if (typeof window === "undefined") return null;
  try {
    const url = new URL(window.location.href);
    const device = url.searchParams.get("device")?.trim();
    if (!device) return null;
    const safe = device.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32);
    return safe || null;
  } catch {
    return null;
  }
}

