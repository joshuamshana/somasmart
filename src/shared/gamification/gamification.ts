import { db } from "@/shared/db/db";
import type { Badge, BadgeId, Streak } from "@/shared/types";

function nowIso() {
  return new Date().toISOString();
}

function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function toLocalYmd(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDaysLocalYmd(ymd: string, days: number) {
  const [y, m, d] = ymd.split("-").map((x) => Number(x));
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  dt.setDate(dt.getDate() + days);
  return toLocalYmd(dt);
}

export function computeNextStreak(existing: Streak | null, todayYmd: string) {
  if (!existing) {
    return { studentId: "", currentStreakDays: 1, lastActiveDate: todayYmd, updatedAt: nowIso() } as Streak;
  }
  if (existing.lastActiveDate === todayYmd) return { ...existing, updatedAt: nowIso() };

  const yesterday = addDaysLocalYmd(todayYmd, -1);
  const nextDays = existing.lastActiveDate === yesterday ? existing.currentStreakDays + 1 : 1;
  return { ...existing, currentStreakDays: nextDays, lastActiveDate: todayYmd, updatedAt: nowIso() };
}

export async function awardBadgeIfMissing(studentId: string, badgeId: BadgeId) {
  const existing = (await db.badges.toArray()).find((b) => b.studentId === studentId && b.badgeId === badgeId);
  if (existing) return existing;
  const row: Badge = { id: newId("badge"), studentId, badgeId, earnedAt: nowIso() };
  await db.badges.add(row);
  return row;
}

export async function recordLearningActivity(studentId: string, at: Date = new Date()) {
  const todayYmd = toLocalYmd(at);
  await db.transaction("rw", [db.streaks, db.badges], async () => {
    const existing = (await db.streaks.get(studentId)) ?? null;
    const next = computeNextStreak(existing, todayYmd);
    next.studentId = studentId;
    await db.streaks.put(next);

    if (next.currentStreakDays >= 3) await awardBadgeIfMissing(studentId, "streak_3_days");
    if (next.currentStreakDays >= 7) await awardBadgeIfMissing(studentId, "streak_7_days");
  });
}

