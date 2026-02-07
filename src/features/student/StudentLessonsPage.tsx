import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import type { CurriculumClass, CurriculumLevel, CurriculumSubject, Lesson } from "@/shared/types";
import { db } from "@/shared/db/db";
import { Card } from "@/shared/ui/Card";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { useAuth } from "@/features/auth/authContext";
import { canAccessLesson } from "@/shared/access/accessEngine";
import { getSubjectAccessDefaultsByCurriculumSubjectId } from "@/shared/db/accessDefaultsRepo";
import { getLessonLearningState } from "@/features/student/lessonLearningState";

export function StudentLessonsPage() {
  const location = useLocation();
  const search = location.search ?? "";
  const { user } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [levelId, setLevelId] = useState("");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [language, setLanguage] = useState("");
  const [q, setQ] = useState("");
  const [levels, setLevels] = useState<CurriculumLevel[]>([]);
  const [classes, setClasses] = useState<CurriculumClass[]>([]);
  const [subjects, setSubjects] = useState<CurriculumSubject[]>([]);
  const [grants, setGrants] = useState<import("@/shared/types").LicenseGrant[]>([]);
  const [subjectDefaults, setSubjectDefaults] = useState<Record<string, import("@/shared/types").AccessPolicy>>({});
  const [progressByLessonId, setProgressByLessonId] = useState<Record<string, import("@/shared/types").Progress>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await db.lessons.where("status").equals("approved").toArray();
      if (cancelled) return;
      const now = new Date().toISOString();
      setLessons(rows.filter((l) => !l.deletedAt && (!l.expiresAt || l.expiresAt > now)));
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
      if (!user) return;
      const progress = (await db.progress.toArray()).filter((p) => p.studentId === user.id);
      const map: Record<string, import("@/shared/types").Progress> = {};
      for (const row of progress) {
        const prev = map[row.lessonId];
        if (!prev || row.lastSeenAt > prev.lastSeenAt) map[row.lessonId] = row;
      }
      if (cancelled) return;
      setProgressByLessonId(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) return;
      const now = new Date().toISOString();
      const g = (await db.licenseGrants.toArray()).filter(
        (x) => x.studentId === user.id && !x.deletedAt && (!x.validUntil || x.validUntil > now)
      );
      if (cancelled) return;
      setGrants(g);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const classesForLevel = useMemo(() => classes.filter((c) => c.levelId === levelId), [classes, levelId]);
  const subjectsForClass = useMemo(() => subjects.filter((s) => s.classId === classId), [classId, subjects]);

  useEffect(() => {
    if (levelId && classId && !classesForLevel.some((c) => c.id === classId)) {
      setClassId("");
      setSubjectId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classesForLevel.length, levelId]);

  useEffect(() => {
    if (classId && subjectId && !subjectsForClass.some((s) => s.id === subjectId)) {
      setSubjectId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectsForClass.length, classId]);

  const selectedLevelName = useMemo(() => levels.find((l) => l.id === levelId)?.name ?? null, [levelId, levels]);
  const selectedClassName = useMemo(() => classes.find((c) => c.id === classId)?.name ?? null, [classId, classes]);
  const selectedSubjectName = useMemo(
    () => subjects.find((s) => s.id === subjectId)?.name ?? null,
    [subjectId, subjects]
  );

  const languages = useMemo(
    () => Array.from(new Set(lessons.map((l) => String(l.language ?? "")))).filter(Boolean).sort(),
    [lessons]
  );

  const filtered = lessons.filter((l) => {
    if (levelId) {
      const match = (l.curriculumLevelId && l.curriculumLevelId === levelId) || (selectedLevelName && l.level === selectedLevelName);
      if (!match) return false;
    }
    if (classId) {
      const match =
        (l.curriculumClassId && l.curriculumClassId === classId) ||
        (selectedClassName && (l.className ?? "") === selectedClassName);
      if (!match) return false;
    }
    if (subjectId) {
      const match =
        (l.curriculumSubjectId && l.curriculumSubjectId === subjectId) ||
        (selectedSubjectName && l.subject === selectedSubjectName);
      if (!match) return false;
    }
    if (language && String(l.language ?? "") !== language) return false;
    if (q) {
      const qq = q.toLowerCase();
      if (!l.title.toLowerCase().includes(qq) && !l.description.toLowerCase().includes(qq)) return false;
    }
    return true;
  });

  if (!user) return null;

  const accessSummary = filtered.reduce(
    (acc, lesson) => {
      const access = canAccessLesson({ lesson, grants, subjectDefaultsByCurriculumSubjectId: subjectDefaults });
      if (access.allowed) acc.available += 1;
      else acc.locked += 1;
      return acc;
    },
    { available: 0, locked: 0 }
  );

  return (
    <div className="section-rhythm">
      <Card>
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <h2 className="text-h1 text-text-title">Find and continue lessons</h2>
            <p className="mt-2 text-body text-text-subtle">
              Discover lessons by curriculum and keep learning from where you left off.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="paper-secondary p-3">
              <div className="text-caption font-semibold uppercase tracking-wide text-text-subtle">Results</div>
              <div className="mt-1 text-h2 text-text-title">{filtered.length}</div>
            </div>
            <div className="paper-secondary p-3">
              <div className="text-caption font-semibold uppercase tracking-wide text-text-subtle">Available</div>
              <div className="mt-1 text-h2 text-status-success">{accessSummary.available}</div>
            </div>
            <div className="paper-secondary p-3">
              <div className="text-caption font-semibold uppercase tracking-wide text-text-subtle">Locked</div>
              <div className="mt-1 text-h2 text-status-warning">{accessSummary.locked}</div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-[88px] lg:self-start">
          <Card title="Filters" paper="secondary">
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
        </aside>

        <Card
          title="Lesson results"
          actions={<div className="text-caption font-semibold uppercase tracking-wide text-text-subtle">{filtered.length} shown</div>}
        >
          <div className="grid gap-3">
            {filtered.map((l) => {
              const access = canAccessLesson({
                lesson: l,
                grants,
                subjectDefaultsByCurriculumSubjectId: subjectDefaults
              });
              const learningState = getLessonLearningState(progressByLessonId[l.id]);
              const learningStateLabel =
                learningState === "completed" ? "Completed" : learningState === "in_progress" ? "In progress" : "New";
              const callToAction =
                learningState === "completed" ? "Replay" : learningState === "in_progress" ? "Continue" : "Start";
              return (
                <Link
                  key={l.id}
                  to={`/student/lessons/${l.id}${search}`}
                  className="paper-secondary rounded-lg p-4 transition-colors hover:border-border-strong"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-text-title">{l.title}</div>
                      <div className="mt-1 text-xs text-text-subtle">
                        {l.subject} • {l.level} • {l.language}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-paper px-2.5 py-1 text-caption font-semibold text-text-subtle">{learningStateLabel}</span>
                        <span className="text-xs font-semibold text-link">{callToAction}</span>
                      </div>
                      <div className="mt-2 text-sm text-text-body">{l.description}</div>
                    </div>
                    <div
                      className={`rounded-full px-2.5 py-1 text-caption font-semibold ${
                        access.allowed
                          ? "bg-status-success-bg text-status-success"
                          : "bg-status-warning-bg text-status-warning"
                      }`}
                    >
                      {access.allowed ? "Available" : "Locked"}
                    </div>
                  </div>
                </Link>
              );
            })}
            {filtered.length === 0 ? <div className="text-sm text-text-subtle">No lessons found.</div> : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
