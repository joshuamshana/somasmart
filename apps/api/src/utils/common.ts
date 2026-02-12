import { randomUUID } from "node:crypto";

export function nowIso() {
  return new Date().toISOString();
}

export function addDays(days: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

export function newId(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}
