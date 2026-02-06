import React, { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import type {
  CurriculumClass,
  CurriculumLevel,
  CurriculumSubject,
  Badge,
  Lesson,
  Progress,
  QuizAttempt
} from "@/shared/types";
import { db } from "@/shared/db/db";
import { Card } from "@/shared/ui/Card";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { useAuth } from "@/features/auth/authContext";
import { getSubjectAccessDefaultsByCurriculumSubjectId } from "@/shared/db/accessDefaultsRepo";
import { getLessonEffectiveAccessPolicy } from "@/shared/access/accessEngine";

function buildLoginLink({ search, nextPath }: { search: string; nextPath: string }) {
  const join = search.includes("?") ? "&" : "?";
  return `/login${search}${join}next=${encodeURIComponent(nextPath)}`;
}

export function LearnLandingPage() {
  const location = useLocation();
  const search = location.search ?? "";
  const { user, loading } = useAuth();

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [levelId, setLevelId] = useState("");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [language, setLanguage] = useState("");
  const [q, setQ] = useState("");
  const [subjectDefaults, setSubjectDefaults] = useState<Record<string, import("@/shared/types").AccessPolicy>>({});
  const [levels, setLevels] = useState<CurriculumLevel[]>([]);
  const [classes, setClasses] = useState<CurriculumClass[]>([]);
  const [subjects, setSubjects] = useState<CurriculumSubject[]>([]);

  // Student-only personalization
  const [progress, setProgress] = useState<Progress[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [streakDays, setStreakDays] = useState(0);
  const [badges, setBadges] = useState<Badge[]>([]);

  // Redirect non-students away from public/student landing.
  if (!loading && user && user.role !== "student") {
    if (user.role === "teacher") return <Navigate to={`/teacher${search}`} replace />;
    if (user.role === "admin") return <Navigate to={`/admin${search}`} replace />;
    if (user.role === "school_admin") return <Navigate to={`/school${search}`} replace />;
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await db.lessons.where("status").equals("approved").toArray();
      const now = new Date().toISOString();
      const visible = rows.filter((l) => !l.deletedAt && (!l.expiresAt || l.expiresAt > now));
      if (cancelled) return;
      setLessons(visible);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const lvls = (await db.curriculumLevels.toArray()).filter((l) => !l.deletedAt);
      const cls = (await db.curriculumClasses.toArray()).filter((c) => !c.deletedAt);
      const subs = (await db.curriculumSubjects.toArray()).filter((s) => !s.deletedAt);
      if (cancelled) return;
      setLevels(lvls.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)));
      setClasses(cls.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)));
      setSubjects(subs.sort((a, b) => a.name.localeCompare(b.name)));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const map = await getSubjectAccessDefaultsByCurriculumSubjectId();
      if (cancelled) return;
      setSubjectDefaults(map);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user || user.role !== "student") {
        if (!cancelled) {
          setProgress([]);
          setAttempts([]);
          setStreakDays(0);
          setBadges([]);
        }
        return;
      }
      const p = (await db.progress.toArray()).filter((x) => x.studentId === user.id);
      const a = (await db.quizAttempts.toArray()).filter((x) => x.studentId === user.id);
      const streak = await db.streaks.get(user.id);
      const earned = (await db.badges.toArray()).filter((b) => b.studentId === user.id);
      if (cancelled) return;
      setProgress(p);
      setAttempts(a);
      setStreakDays(streak?.currentStreakDays ?? 0);
      setBadges(earned.sort((x, y) => y.earnedAt.localeCompare(x.earnedAt)));
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.role]);

  const languages = useMemo(
    () => Array.from(new Set(lessons.map((l) => String(l.language ?? "")))).filter(Boolean).sort(),
    [lessons]
  );

  const classesForLevel = useMemo(() => classes.filter((c) => c.levelId === levelId), [classes, levelId]);
  const subjectsForClass = useMemo(() => subjects.filter((s) => s.classId === classId), [subjects, classId]);

  useEffect(() => {
    if (levelId && classId && !classesForLevel.some((c) => c.id === classId)) {
      setClassId("");
      setSubjectId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelId]);

  useEffect(() => {
    if (classId && subjectId && !subjectsForClass.some((s) => s.id === subjectId)) {
      setSubjectId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

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
      .sort(
        (a, b) =>
          (progressByLessonId[b.id]?.lastSeenAt ?? "").localeCompare(progressByLessonId[a.id]?.lastSeenAt ?? "")
      );
    return inProgress.slice(0, 3);
  }, [lessons, progressByLessonId]);

  const filtered = lessons
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .filter((l) => {
      if (levelId && l.curriculumLevelId !== levelId) return false;
      if (classId && l.curriculumClassId !== classId) return false;
      if (subjectId && l.curriculumSubjectId !== subjectId) return false;
      if (language && String(l.language ?? "") !== language) return false;
      if (q) {
        const qq = q.toLowerCase();
        if (!l.title.toLowerCase().includes(qq) && !l.description.toLowerCase().includes(qq)) return false;
      }
      return true;
    });

  const isStudent = Boolean(user && user.role === "student");

  return (
    <div className="space-y-4">
      <Card title={isStudent ? "Learn" : "Learn (Public)"}>
        <div className="text-sm text-slate-300">
          {isStudent
            ? "Continue learning and discover new lessons."
            : "Browse lessons. Sign in to open any lesson."}
        </div>
        {!loading && !user ? (
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <Link className="text-sky-400 hover:underline" to={`/login${search}`}>
              Login
            </Link>
            <Link className="text-sky-400 hover:underline" to={`/register${search}`}>
              Register (Student)
            </Link>
          </div>
        ) : null}
        {isStudent ? (
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <Link className="text-sky-400 hover:underline" to={`/student/lessons${search}`}>
              Browse lessons
            </Link>
            <Link className="text-sky-400 hover:underline" to={`/student/progress${search}`}>
              Progress
            </Link>
            <Link className="text-sky-400 hover:underline" to={`/student/payments${search}`}>
              Enroll / Payments
            </Link>
          </div>
        ) : null}
      </Card>

      {isStudent ? (
        <div className="grid gap-4 md:grid-cols-4">
          <Card title="Continue learning">
            {continueLessons.length === 0 ? (
              <div className="text-sm text-slate-400">Start a lesson to see it here.</div>
            ) : (
              <div className="space-y-3">
                {continueLessons.map((l) => (
                  <Link
                    key={l.id}
                    to={`/student/lessons/${l.id}${search}`}
                    className="block rounded-lg border border-slate-800 bg-slate-950 p-3 hover:border-slate-700"
                  >
                    <div className="text-sm font-semibold text-slate-200">{l.title}</div>
                    <div className="mt-1 text-xs text-slate-400">
                      Last seen: {new Date(progressByLessonId[l.id]!.lastSeenAt).toLocaleString()}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
          <Card title="Completed lessons">
            <div className="text-2xl font-semibold">
              {progress.filter((p) => Boolean(p.completedAt)).length}
            </div>
            <div className="text-xs text-slate-400">Keep going.</div>
          </Card>
          <Card title="Quiz attempts">
            <div className="text-2xl font-semibold">{attempts.length}</div>
            <div className="text-xs text-slate-400">Self tests taken.</div>
          </Card>
          <Card title="Streak">
            <div className="text-2xl font-semibold">{streakDays}</div>
            <div className="text-xs text-slate-400">Days active in a row</div>
            <div className="mt-2 text-xs text-slate-500">Complete lessons or quizzes to keep it going.</div>
          </Card>
        </div>
      ) : null}

      {isStudent ? (
        <Card title="Badges">
          <div className="text-sm text-slate-300">{badges.length} earned</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {badges.slice(0, 10).map((b) => (
              <span key={b.id} className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-200">
                {b.badgeId}
              </span>
            ))}
          </div>
          {badges.length === 0 ? <div className="mt-2 text-xs text-slate-500">No badges yet.</div> : null}
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[320px,1fr]">
        <div className="lg:sticky lg:top-20 lg:self-start">
          <div className="lg:hidden">
            <details className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <summary className="cursor-pointer text-sm font-semibold text-slate-200">
                Filters
              </summary>
              <div className="mt-4 grid gap-3">
                <Input label="Search" value={q} onChange={(e) => setQ(e.target.value)} />
                <Select
                  label="Level"
                  value={levelId}
                  onChange={(e) => {
                    setLevelId(e.target.value);
                    setClassId("");
                    setSubjectId("");
                  }}
                >
                  <option value="">All</option>
                  {levels.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </Select>
                <Select
                  label="Class"
                  value={classId}
                  onChange={(e) => {
                    setClassId(e.target.value);
                    setSubjectId("");
                  }}
                  disabled={!levelId}
                >
                  <option value="">All</option>
                  {classesForLevel.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
                <Select
                  label="Subject"
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  disabled={!classId}
                >
                  <option value="">All</option>
                  {subjectsForClass.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
                <Select label="Language" value={language} onChange={(e) => setLanguage(e.target.value)}>
                  <option value="">All</option>
                  {languages.map((lng) => (
                    <option key={lng} value={lng}>
                      {lng}
                    </option>
                  ))}
                </Select>
              </div>
            </details>
          </div>

          <div className="hidden lg:block">
            <Card title="Filters">
              <div className="grid gap-3">
                <Input label="Search" value={q} onChange={(e) => setQ(e.target.value)} />
                <Select
                  label="Level"
                  value={levelId}
                  onChange={(e) => {
                    setLevelId(e.target.value);
                    setClassId("");
                    setSubjectId("");
                  }}
                >
                  <option value="">All</option>
                  {levels.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </Select>
                <Select
                  label="Class"
                  value={classId}
                  onChange={(e) => {
                    setClassId(e.target.value);
                    setSubjectId("");
                  }}
                  disabled={!levelId}
                >
                  <option value="">All</option>
                  {classesForLevel.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
                <Select
                  label="Subject"
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  disabled={!classId}
                >
                  <option value="">All</option>
                  {subjectsForClass.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
                <Select label="Language" value={language} onChange={(e) => setLanguage(e.target.value)}>
                  <option value="">All</option>
                  {languages.map((lng) => (
                    <option key={lng} value={lng}>
                      {lng}
                    </option>
                  ))}
                </Select>
              </div>
            </Card>
          </div>
        </div>

        <div className="space-y-3">
          {filtered.map((l) => {
            const policy = getLessonEffectiveAccessPolicy({
              lesson: l,
              subjectDefaultsByCurriculumSubjectId: subjectDefaults
            });

            const lessonPath = `/student/lessons/${l.id}${search}`;
            const to = isStudent ? lessonPath : buildLoginLink({ search, nextPath: lessonPath });

            return (
              <Link
                key={l.id}
                to={to}
                className="block rounded-xl border border-slate-800 bg-slate-950 p-4 hover:border-slate-700"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{l.title}</div>
                    <div className="mt-1 text-xs text-slate-400">
                      {l.subject} • {l.level} • {l.language}
                    </div>
                    <div className="mt-2 text-sm text-slate-300">{l.description}</div>
                    {!isStudent ? (
                      <div className="mt-3 text-xs text-slate-400">Sign in to view</div>
                    ) : null}
                  </div>
                  <div
                    className={`shrink-0 rounded px-2 py-1 text-xs ${
                      policy === "free" ? "bg-emerald-950 text-emerald-200" : "bg-amber-950 text-amber-200"
                    }`}
                  >
                    {policy === "free" ? "Free" : "Requires coupon"}
                  </div>
                </div>
              </Link>
            );
          })}
          {filtered.length === 0 ? <div className="text-sm text-slate-400">No lessons found.</div> : null}
        </div>
      </div>
    </div>
  );
}
