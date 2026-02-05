import React, { useEffect, useMemo, useState } from "react";
import { Card } from "@/shared/ui/Card";
import { db } from "@/shared/db/db";
import type { Lesson, QuizAttempt, User } from "@/shared/types";

function isWithinDays(iso: string, days: number) {
  const t = new Date(iso).getTime();
  return Date.now() - t <= days * 24 * 3600 * 1000;
}

export function AdminAnalyticsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [activeStudents7d, setActiveStudents7d] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const u = await db.users.toArray();
      const l = await db.lessons.toArray();
      const a = await db.quizAttempts.toArray();
      const prog = await db.progress.toArray();
      const active = new Set<string>();
      prog.forEach((p) => {
        if (isWithinDays(p.lastSeenAt, 7)) active.add(p.studentId);
      });
      a.forEach((x) => {
        if (isWithinDays(x.createdAt, 7)) active.add(x.studentId);
      });
      if (cancelled) return;
      setUsers(u);
      setLessons(l);
      setAttempts(a);
      setActiveStudents7d(Array.from(active).filter((id) => u.some((uu) => uu.id === id && uu.role === "student")).length);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const byRole = useMemo(() => {
    const m = { student: 0, teacher: 0, admin: 0, school_admin: 0 };
    users.forEach((u) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (m as any)[u.role] = ((m as any)[u.role] ?? 0) + 1;
    });
    return m;
  }, [users]);

  const pendingTeachers = users.filter((u) => u.role === "teacher" && u.status === "pending").length;
  const pendingLessons = lessons.filter((l) => l.status === "pending_approval").length;
  const approvedLessons = lessons.filter((l) => l.status === "approved").length;
  const avgScore = attempts.length ? Math.round(attempts.reduce((acc, a) => acc + a.score, 0) / attempts.length) : 0;

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card title="Users (students)">{byRole.student}</Card>
      <Card title="Users (teachers)">{byRole.teacher}</Card>
      <Card title="Pending teachers">{pendingTeachers}</Card>
      <Card title="Active students (7d)">{activeStudents7d}</Card>
      <Card title="Lessons (approved)">{approvedLessons}</Card>
      <Card title="Lessons (pending)">{pendingLessons}</Card>
      <Card title="Avg quiz score">{avgScore}%</Card>
    </div>
  );
}

