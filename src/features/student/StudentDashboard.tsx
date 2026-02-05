import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/shared/ui/Card";
import { useAuth } from "@/features/auth/authContext";
import { db } from "@/shared/db/db";

export function StudentDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ lessons: 0, completed: 0, attempts: 0 });
  const [streakDays, setStreakDays] = useState(0);
  const [badges, setBadges] = useState<import("@/shared/types").Badge[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) return;
      const now = new Date().toISOString();
      const lessons = (await db.lessons.where("status").equals("approved").toArray()).filter(
        (l) => !l.deletedAt && (!l.expiresAt || l.expiresAt > now)
      ).length;
      const progress = await db.progress.toArray();
      const completed = progress.filter((p) => p.studentId === user.id && p.completedAt).length;
      const attempts = (await db.quizAttempts.toArray()).filter((a) => a.studentId === user.id).length;
      const streak = await db.streaks.get(user.id);
      const earned = (await db.badges.toArray()).filter((b) => b.studentId === user.id);
      if (cancelled) return;
      setStats({ lessons, completed, attempts });
      setStreakDays(streak?.currentStreakDays ?? 0);
      setBadges(earned.sort((a, b) => b.earnedAt.localeCompare(a.earnedAt)));
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) return null;

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card title="Welcome">
        <div className="text-sm text-slate-300">Hello, {user.displayName}.</div>
        <div className="mt-3 flex gap-2">
          <Link className="text-sm text-sky-400 hover:underline" to="/student/lessons">
            Browse lessons
          </Link>
        </div>
      </Card>
      <Card title="Lessons">
        <div className="text-2xl font-semibold">{stats.lessons}</div>
        <div className="text-xs text-slate-400">Approved lessons available offline</div>
      </Card>
      <Card title="Your progress">
        <div className="text-2xl font-semibold">{stats.completed}</div>
        <div className="text-xs text-slate-400">Lessons completed</div>
        <div className="mt-2 text-xs text-slate-500">{stats.attempts} quiz attempts</div>
      </Card>
      <Card title="Streak">
        <div className="text-2xl font-semibold">{streakDays}</div>
        <div className="text-xs text-slate-400">Days active in a row</div>
        <div className="mt-2 text-xs text-slate-500">Complete lessons or quizzes to keep it going.</div>
      </Card>
      <Card title="Badges">
        <div className="text-sm text-slate-300">{badges.length} earned</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {badges.slice(0, 6).map((b) => (
            <span key={b.id} className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-200">
              {b.badgeId}
            </span>
          ))}
        </div>
        {badges.length === 0 ? <div className="mt-2 text-xs text-slate-500">No badges yet.</div> : null}
      </Card>
    </div>
  );
}
