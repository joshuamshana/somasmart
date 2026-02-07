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
  const featured = filtered.slice(0, 3);
  const newest = filtered;

  return (
    <div className="section-rhythm">
      <Card className="overflow-hidden" density="comfortable">
        <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="inline-flex rounded-full bg-action-primary/15 px-3 py-1 text-caption font-semibold uppercase tracking-wide text-action-primary-active">
                SomaSmart Learning Hub
              </div>
              <div className="text-h3 text-text-title">{isStudent ? "Learn" : "Learn (Public)"}</div>
              <h2 className="text-display text-text-title">
                {isStudent ? "Keep momentum in your lessons." : "A modern way to learn anywhere."}
              </h2>
              <p className="max-w-2xl text-body text-text-subtle">
                {isStudent
                  ? "Continue your learning journey with structured lessons, progress cues, and guided next steps."
                  : "Browse curriculum-aligned lessons, discover what to learn next, and sign in when you are ready to start."}
              </p>
            </div>
            {!loading && !user ? (
              <div className="flex flex-wrap gap-3">
                <Link to={`/register${search}`}>
                  <span className="inline-flex h-10 items-center rounded-md bg-action-primary px-5 text-sm font-semibold text-action-primary-fg transition-colors hover:bg-action-primary-hover">
                    Start as a student
                  </span>
                </Link>
                <Link to={`/login${search}`}>
                  <span className="inline-flex h-10 items-center rounded-md bg-action-secondary px-5 text-sm font-semibold text-action-secondary-fg transition-colors hover:bg-action-secondary-hover">
                    Login
                  </span>
                </Link>
              </div>
            ) : null}
            {isStudent ? (
              <div className="flex flex-wrap gap-3">
                <Link to={`/student/lessons${search}`} className="text-sm font-semibold text-link hover:underline">
                  Browse lessons
                </Link>
                <Link to={`/student/progress${search}`} className="text-sm font-semibold text-link hover:underline">
                  Track progress
                </Link>
                <Link to={`/student/payments${search}`} className="text-sm font-semibold text-link hover:underline">
                  Access and payments
                </Link>
              </div>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="paper-secondary p-4">
              <div className="text-caption font-semibold uppercase tracking-wide text-text-subtle">Lessons</div>
              <div className="mt-2 text-h2 text-text-title">{lessons.length}</div>
              <div className="text-xs text-text-subtle">Available in catalog</div>
            </div>
            <div className="paper-secondary p-4">
              <div className="text-caption font-semibold uppercase tracking-wide text-text-subtle">Languages</div>
              <div className="mt-2 text-h2 text-text-title">{languages.length}</div>
              <div className="text-xs text-text-subtle">Learning options</div>
            </div>
            <div className="paper-secondary p-4">
              <div className="text-caption font-semibold uppercase tracking-wide text-text-subtle">Subjects</div>
              <div className="mt-2 text-h2 text-text-title">{subjects.length}</div>
              <div className="text-xs text-text-subtle">Curriculum mapped</div>
            </div>
          </div>
        </div>
      </Card>

      {isStudent ? (
        <div className="grid gap-4 lg:grid-cols-4">
          <Card title="Continue learning" paper="secondary">
            {continueLessons.length === 0 ? (
              <div className="text-sm text-text-subtle">Start a lesson to see recommendations here.</div>
            ) : (
              <div className="space-y-2">
                {continueLessons.map((l) => (
                  <Link
                    key={l.id}
                    to={`/student/lessons/${l.id}${search}`}
                    className="block rounded-md border border-border-subtle bg-paper px-3 py-2 hover:border-border-strong"
                  >
                    <div className="truncate text-sm font-semibold text-text-title">{l.title}</div>
                    <div className="mt-1 text-xs text-text-subtle">
                      Last seen: {new Date(progressByLessonId[l.id]!.lastSeenAt).toLocaleString()}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
          <Card title="Completed" paper="secondary">
            <div className="text-h1 text-text-title">{progress.filter((p) => Boolean(p.completedAt)).length}</div>
            <div className="text-xs text-text-subtle">Lessons finished</div>
          </Card>
          <Card title="Quiz attempts" paper="secondary">
            <div className="text-h1 text-text-title">{attempts.length}</div>
            <div className="text-xs text-text-subtle">Self assessments taken</div>
          </Card>
          <Card title="Streak" paper="secondary">
            <div className="text-h1 text-text-title">{streakDays}</div>
            <div className="text-xs text-text-subtle">Days active in a row</div>
          </Card>
        </div>
      ) : null}

      {featured.length > 0 ? (
        <Card title="Featured lessons">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {featured.map((l) => {
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
                  className="paper-secondary flex h-full flex-col gap-2 p-4 transition-colors hover:border-border-strong"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-semibold text-text-title">
                      {isStudent ? l.title : "Recommended lesson"}
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-caption font-semibold ${
                        policy === "free"
                          ? "bg-status-success-bg text-status-success"
                          : "bg-status-warning-bg text-status-warning"
                      }`}
                    >
                      {policy === "free" ? "Free" : "Coupon"}
                    </span>
                  </div>
                  <div className="text-xs text-text-subtle">{l.subject} • {l.level} • {l.language}</div>
                  <div className="text-sm text-text-body">{l.description}</div>
                  {!isStudent ? <div className="mt-auto text-xs font-semibold text-link">Sign in to start</div> : null}
                </Link>
              );
            })}
          </div>
        </Card>
      ) : null}

      {isStudent ? (
        <Card title="Badges" paper="secondary">
          <div className="text-sm text-text-subtle">{badges.length} earned</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {badges.slice(0, 10).map((b) => (
              <span key={b.id} className="rounded-full bg-action-secondary px-3 py-1 text-caption font-semibold text-action-secondary-fg">
                {b.badgeId}
              </span>
            ))}
          </div>
          {badges.length === 0 ? <div className="mt-2 text-xs text-text-subtle">No badges yet.</div> : null}
        </Card>
      ) : (
        <Card title="Why learners choose SomaSmart" paper="secondary">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="paper-primary p-3">
              <div className="text-sm font-semibold text-text-title">Curriculum aligned</div>
              <div className="mt-1 text-xs text-text-subtle">Level, class, and subject-based discovery.</div>
            </div>
            <div className="paper-primary p-3">
              <div className="text-sm font-semibold text-text-title">Offline-first</div>
              <div className="mt-1 text-xs text-text-subtle">Learn with unstable connectivity in mind.</div>
            </div>
            <div className="paper-primary p-3">
              <div className="text-sm font-semibold text-text-title">Progressive learning</div>
              <div className="mt-1 text-xs text-text-subtle">Structured lessons with outcomes-focused flow.</div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-[88px] lg:self-start">
          <div className="lg:hidden">
            <details className="paper-secondary p-4">
              <summary className="cursor-pointer text-sm font-semibold text-text-title">
                Refine lessons
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
            <Card title="Refine lessons" paper="secondary">
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

        <Card
          title="Discover lessons"
          actions={<div className="text-xs font-semibold uppercase tracking-wide text-text-subtle">{newest.length} results</div>}
        >
          <div className="space-y-3">
            {newest.map((l) => {
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
                  className="paper-secondary block p-4 transition-colors hover:border-border-strong"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-text-title">{l.title}</div>
                      <div className="mt-1 text-xs text-text-subtle">
                        {l.subject} • {l.level} • {l.language}
                      </div>
                      <div className="mt-2 text-sm text-text-body">{l.description}</div>
                      {!isStudent ? (
                        <div className="mt-3 text-xs font-semibold text-link">Sign in to view</div>
                      ) : null}
                    </div>
                    <div
                      className={`shrink-0 rounded-full px-2.5 py-1 text-caption font-semibold ${
                        policy === "free"
                          ? "bg-status-success-bg text-status-success"
                          : "bg-status-warning-bg text-status-warning"
                      }`}
                    >
                      {policy === "free" ? "Free" : "Requires coupon"}
                    </div>
                  </div>
                </Link>
              );
            })}
            {newest.length === 0 ? <div className="text-sm text-text-subtle">No lessons found.</div> : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
