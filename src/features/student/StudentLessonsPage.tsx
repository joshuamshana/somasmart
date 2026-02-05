import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Lesson } from "@/shared/types";
import { db } from "@/shared/db/db";
import { Card } from "@/shared/ui/Card";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { useAuth } from "@/features/auth/authContext";
import { canAccessLesson } from "@/shared/access/accessEngine";

export function StudentLessonsPage() {
  const { user } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState("");
  const [language, setLanguage] = useState("");
  const [q, setQ] = useState("");
  const [grants, setGrants] = useState<import("@/shared/types").LicenseGrant[]>([]);

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

  const subjects = useMemo(
    () => Array.from(new Set(lessons.map((l) => l.subject))).sort(),
    [lessons]
  );
  const levels = useMemo(() => Array.from(new Set(lessons.map((l) => l.level))).sort(), [lessons]);
  const languages = useMemo(
    () => Array.from(new Set(lessons.map((l) => String(l.language ?? "")))).filter(Boolean).sort(),
    [lessons]
  );

  const filtered = lessons.filter((l) => {
    if (subject && l.subject !== subject) return false;
    if (level && l.level !== level) return false;
    if (language && String(l.language ?? "") !== language) return false;
    if (q) {
      const qq = q.toLowerCase();
      if (!l.title.toLowerCase().includes(qq) && !l.description.toLowerCase().includes(qq)) return false;
    }
    return true;
  });

  if (!user) return null;

  return (
    <div className="space-y-4">
      <Card title="Lessons">
        <div className="grid gap-3 md:grid-cols-4">
          <Input label="Search" value={q} onChange={(e) => setQ(e.target.value)} />
          <Select label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)}>
            <option value="">All</option>
            {subjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Select label="Level" value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="">All</option>
            {levels.map((s) => (
              <option key={s} value={s}>
                {s}
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

      <div className="grid gap-3">
        {filtered.map((l) => {
          const access = canAccessLesson({ lesson: l, grants });
          return (
            <Link
              key={l.id}
              to={`/student/lessons/${l.id}`}
              className="rounded-xl border border-slate-800 bg-slate-950 p-4 hover:border-slate-700"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold">{l.title}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    {l.subject} • {l.level} • {l.language}
                  </div>
                  <div className="mt-2 text-sm text-slate-300">{l.description}</div>
                </div>
                <div className={`rounded px-2 py-1 text-xs ${access.allowed ? "bg-emerald-950 text-emerald-200" : "bg-amber-950 text-amber-200"}`}>
                  {access.allowed ? "Available" : "Locked"}
                </div>
              </div>
            </Link>
          );
        })}
        {filtered.length === 0 ? <div className="text-sm text-slate-400">No lessons found.</div> : null}
      </div>
    </div>
  );
}
