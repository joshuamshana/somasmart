import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/features/auth/authContext";
import { Card } from "@/shared/ui/Card";
import { db } from "@/shared/db/db";
import type { QuizAttempt, User } from "@/shared/types";

function isWithinDays(iso: string, days: number) {
  const t = new Date(iso).getTime();
  return Date.now() - t <= days * 24 * 3600 * 1000;
}

export function SchoolAnalyticsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<User[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [active7d, setActive7d] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.schoolId) return;
      const users = await db.users.toArray();
      const s = users.filter((u) => u.schoolId === user.schoolId && u.role === "student");
      const prog = await db.progress.toArray();
      const at = await db.quizAttempts.toArray();
      const completed = prog.filter((p) => s.some((st) => st.id === p.studentId) && p.completedAt).length;
      const activeStudents = new Set<string>();
      prog.forEach((p) => {
        if (s.some((st) => st.id === p.studentId) && isWithinDays(p.lastSeenAt, 7)) activeStudents.add(p.studentId);
      });
      at.forEach((a) => {
        if (s.some((st) => st.id === a.studentId) && isWithinDays(a.createdAt, 7)) activeStudents.add(a.studentId);
      });
      if (cancelled) return;
      setStudents(s);
      setAttempts(at.filter((a) => s.some((st) => st.id === a.studentId)));
      setCompletedCount(completed);
      setActive7d(activeStudents.size);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const avgScore = useMemo(() => {
    if (attempts.length === 0) return 0;
    return Math.round(attempts.reduce((acc, a) => acc + a.score, 0) / attempts.length);
  }, [attempts]);

  if (!user?.schoolId) return <Card title="Analytics">This account is not linked to a school.</Card>;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card title="Students">{students.length}</Card>
      <Card title="Active (7d)">{active7d}</Card>
      <Card title="Avg quiz score">{avgScore}%</Card>
      <Card title="Lessons completed">{completedCount}</Card>
    </div>
  );
}

