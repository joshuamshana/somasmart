import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Card } from "@/shared/ui/Card";
import { useAuth } from "@/features/auth/authContext";
import { db } from "@/shared/db/db";
import type { CurriculumClass, CurriculumLevel, CurriculumSubject, Lesson, Progress } from "@/shared/types";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { canAccessLesson, getLessonEffectiveAccessPolicy } from "@/shared/access/accessEngine";
import { getSubjectAccessDefaultsByCurriculumSubjectId } from "@/shared/db/accessDefaultsRepo";

export function StudentDashboard() {
  const location = useLocation();
  const search = location.search ?? "";
  const { user } = useAuth();
  const [stats, setStats] = useState({ lessons: 0, completed: 0, attempts: 0 });
  const [streakDays, setStreakDays] = useState(0);
  const [badges, setBadges] = useState<import("@/shared/types").Badge[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [grants, setGrants] = useState<import("@/shared/types").LicenseGrant[]>([]);
  const [levels, setLevels] = useState<CurriculumLevel[]>([]);
  const [classes, setClasses] = useState<CurriculumClass[]>([]);
  const [subjects, setSubjects] = useState<CurriculumSubject[]>([]);
  const [subjectDefaults, setSubjectDefaults] = useState<Record<string, import("@/shared/types").AccessPolicy>>({});

  const [q, setQ] = useState("");
  const [levelId, setLevelId] = useState("");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) return;
      const now = new Date().toISOString();
      const approvedLessons = (await db.lessons.where("status").equals("approved").toArray()).filter(
        (l) => !l.deletedAt && (!l.expiresAt || l.expiresAt > now)
      );
      const allProgress = await db.progress.toArray();
      const myProgress = allProgress.filter((p) => p.studentId === user.id);
      const completed = myProgress.filter((p) => p.completedAt).length;
      const attempts = (await db.quizAttempts.toArray()).filter((a) => a.studentId === user.id).length;
      const streak = await db.streaks.get(user.id);
      const earned = (await db.badges.toArray()).filter((b) => b.studentId === user.id);
      const g = (await db.licenseGrants.toArray()).filter((x) => x.studentId === user.id && !x.deletedAt && (!x.validUntil || x.validUntil > now));
      const lvls = (await db.curriculumLevels.toArray()).filter((l) => !l.deletedAt);
      const cls = (await db.curriculumClasses.toArray()).filter((c) => !c.deletedAt);
      const subs = (await db.curriculumSubjects.toArray()).filter((s) => !s.deletedAt);
      const defaults = await getSubjectAccessDefaultsByCurriculumSubjectId();
      if (cancelled) return;
      setStats({ lessons: approvedLessons.length, completed, attempts });
      setStreakDays(streak?.currentStreakDays ?? 0);
      setBadges(earned.sort((a, b) => b.earnedAt.localeCompare(a.earnedAt)));
      setLessons(approvedLessons.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
      setProgress(myProgress);
      setGrants(g);
      setLevels(lvls.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)));
      setClasses(cls.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)));
      setSubjects(subs.sort((a, b) => a.name.localeCompare(b.name)));
      setSubjectDefaults(defaults);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) return null;

  const classesForLevel = useMemo(() => classes.filter((c) => c.levelId === levelId), [classes, levelId]);
  const subjectsForClass = useMemo(() => subjects.filter((s) => s.classId === classId), [subjects, classId]);

  useEffect(() => {
    if (!levels.length) return;
    if (!levelId) setLevelId(levels[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levels]);

  useEffect(() => {
    if (!levelId) return;
    if (classesForLevel.length === 0) {
      if (classId) setClassId("");
      return;
    }
    if (!classId || !classesForLevel.some((c) => c.id === classId)) setClassId(classesForLevel[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelId, classesForLevel]);

  useEffect(() => {
    if (!classId) {
      if (subjectId) setSubjectId("");
      return;
    }
    if (subjectsForClass.length === 0) {
      if (subjectId) setSubjectId("");
      return;
    }
    if (!subjectId || !subjectsForClass.some((s) => s.id === subjectId)) setSubjectId(subjectsForClass[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, subjectsForClass]);

  const progressByLessonId = useMemo(() => {
    const m: Record<string, Progress> = {};
    progress.forEach((p) => {
      const prev = m[p.lessonId];
      if (!prev || p.lastSeenAt > prev.lastSeenAt) m[p.lessonId] = p;
    });
    return m;
  }, [progress]);

  const continueLessons = useMemo(() => {
    const inProgress = lessons
      .filter((l) => {
        const p = progressByLessonId[l.id];
        return p && !p.completedAt;
      })
      .sort((a, b) => (progressByLessonId[b.id]?.lastSeenAt ?? "").localeCompare(progressByLessonId[a.id]?.lastSeenAt ?? ""));
    return inProgress.slice(0, 3);
  }, [lessons, progressByLessonId]);

  const recommended = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const filtered = lessons.filter((l) => {
      if (subjectId && l.curriculumSubjectId !== subjectId) return false;
      if (ql) {
        const blob = `${l.title} ${l.description} ${l.subject} ${l.level}`.toLowerCase();
        if (!blob.includes(ql)) return false;
      }
      return true;
    });

    // Simple heuristic: prioritize items with no progress yet, then recently updated.
    return filtered
      .slice()
      .sort((a, b) => {
        const ap = progressByLessonId[a.id];
        const bp = progressByLessonId[b.id];
        const aStarted = Boolean(ap);
        const bStarted = Boolean(bp);
        if (aStarted !== bStarted) return aStarted ? 1 : -1;
        return b.updatedAt.localeCompare(a.updatedAt);
      })
      .slice(0, 8);
  }, [lessons, progressByLessonId, q, subjectId]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
      <Card title="Welcome">
        <div className="text-sm text-muted">Hello, {user.displayName}.</div>
        <div className="mt-3 flex gap-2">
          <Link className="text-sm text-link hover:underline" to={`/student/lessons${search}`}>
            Browse lessons
          </Link>
        </div>
      </Card>
      <Card title="Lessons">
        <div className="text-2xl font-semibold">{stats.lessons}</div>
        <div className="text-xs text-muted">Approved lessons available offline</div>
      </Card>
      <Card title="Your progress">
        <div className="text-2xl font-semibold">{stats.completed}</div>
        <div className="text-xs text-muted">Lessons completed</div>
        <div className="mt-2 text-xs text-muted">{stats.attempts} quiz attempts</div>
      </Card>
      <Card title="Streak">
        <div className="text-2xl font-semibold">{streakDays}</div>
        <div className="text-xs text-muted">Days active in a row</div>
        <div className="mt-2 text-xs text-muted">Complete lessons or quizzes to keep it going.</div>
      </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Continue learning">
          {continueLessons.length === 0 ? (
            <div className="text-sm text-muted">Start a lesson to see it here.</div>
          ) : (
            <div className="space-y-3">
              {continueLessons.map((l) => (
                <Link
                  key={l.id}
                  to={`/student/lessons/${l.id}${search}`}
                  className="block rounded-lg border border-border bg-surface p-3 hover:border-border/80"
                >
                  <div className="text-sm font-semibold text-text">{l.title}</div>
                  <div className="mt-1 text-xs text-muted">
                    Last seen: {new Date(progressByLessonId[l.id]!.lastSeenAt).toLocaleString()}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card title="Browse curriculum">
          <div className="grid gap-3">
            <Input label="Search" value={q} onChange={(e) => setQ(e.target.value)} />
            <Select label="Level" value={levelId} onChange={(e) => setLevelId(e.target.value)}>
              <option value="">Select…</option>
              {levels.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
            <Select label="Class" value={classId} onChange={(e) => setClassId(e.target.value)} disabled={!levelId}>
              <option value="">Select…</option>
              {classesForLevel.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Select label="Subject" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} disabled={!classId}>
              <option value="">All</option>
              {subjectsForClass.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <div className="text-xs text-muted">
              Enroll/unlock happens via codes (Payments) or school sponsorship.
            </div>
          </div>
        </Card>

        <Card title="Badges">
          <div className="text-sm text-muted">{badges.length} earned</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {badges.slice(0, 6).map((b) => (
              <span key={b.id} className="rounded bg-surface2 px-2 py-1 text-xs text-text">
                {b.badgeId}
              </span>
            ))}
          </div>
          {badges.length === 0 ? <div className="mt-2 text-xs text-muted">No badges yet.</div> : null}
        </Card>
      </div>

      <Card title="Recommended lessons">
        <div className="grid gap-3 md:grid-cols-2">
          {recommended.map((l) => {
            const access = canAccessLesson({ lesson: l, grants, subjectDefaultsByCurriculumSubjectId: subjectDefaults });
            const policy = getLessonEffectiveAccessPolicy({ lesson: l, subjectDefaultsByCurriculumSubjectId: subjectDefaults });
            const p = progressByLessonId[l.id];
            return (
              <Link
                key={l.id}
                to={`/student/lessons/${l.id}${search}`}
                className="rounded-xl border border-border bg-surface p-4 hover:border-border/80"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{l.title}</div>
                    <div className="mt-1 text-xs text-muted">
                      {l.subject} • {l.level} • {l.language}
                    </div>
                    {p ? (
                      <div className="mt-2 text-xs text-muted">
                        {p.completedAt ? "Completed" : "In progress"} • Last seen {new Date(p.lastSeenAt).toLocaleDateString()}
                      </div>
                    ) : (
                      <div className="mt-2 text-xs text-muted">Not started</div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div
                      className={`rounded px-2 py-1 text-xs ${
                        access.allowed ? "bg-success-surface text-success-text" : "bg-warning-surface text-warning-text"
                      }`}
                    >
                      {access.allowed ? "Available" : "Locked"}
                    </div>
                    <div className="text-[11px] text-muted">{policy === "free" ? "Free" : "Coupon"}</div>
                  </div>
                </div>
              </Link>
            );
          })}
          {recommended.length === 0 ? <div className="text-sm text-muted">No lessons found.</div> : null}
        </div>
      </Card>
    </div>
  );
}
