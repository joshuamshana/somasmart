import { db } from "@/shared/db/db";

export async function getSchoolByCode(code: string) {
  const needle = code.trim().toUpperCase();
  const schools = await db.schools.toArray();
  return schools.find((s) => !s.deletedAt && s.code.toUpperCase() === needle) ?? null;
}

export async function getSchoolById(id: string) {
  const row = (await db.schools.get(id)) ?? null;
  if (!row || row.deletedAt) return null;
  return row;
}
