export function formatDateYmd(iso: string) {
  return iso.slice(0, 10);
}

export function formatDateTimeYmdHm(iso: string) {
  // ISO timestamps are stored in UTC (e.g., 2026-01-01T12:34:56.789Z).
  // Keep formatting deterministic to avoid locale differences in tests/snapshots.
  const ymd = iso.slice(0, 10);
  const hm = iso.slice(11, 16);
  return `${ymd} ${hm}`;
}
