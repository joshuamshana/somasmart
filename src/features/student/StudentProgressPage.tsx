import React, { useEffect, useState } from "react";
import { Card } from "@/shared/ui/Card";
import { useAuth } from "@/features/auth/authContext";
import { db } from "@/shared/db/db";
import type { Lesson, Progress, QuizAttempt } from "@/shared/types";
import { Button } from "@/shared/ui/Button";
import { downloadPdf } from "@/shared/reports/pdf";

export function StudentProgressPage() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<Progress[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [lessonsById, setLessonsById] = useState<Record<string, Lesson>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) return;
      const allLessons = await db.lessons.toArray();
      const map: Record<string, Lesson> = {};
      allLessons.forEach((l) => (map[l.id] = l));
      const p = (await db.progress.toArray()).filter((x) => x.studentId === user.id);
      const a = (await db.quizAttempts.toArray()).filter((x) => x.studentId === user.id);
      if (cancelled) return;
      setLessonsById(map);
      setProgress(p);
      setAttempts(a);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) return null;
  const u = user;

  function downloadCsv() {
    const lines: string[] = [];
    lines.push("type,lesson,completed_at,time_spent_sec,last_seen,score,attempted_at");
    for (const p of progress) {
      const lessonTitle = lessonsById[p.lessonId]?.title ?? p.lessonId;
      lines.push(
        [
          "progress",
          csv(lessonTitle),
          csv(p.completedAt ?? ""),
          String(p.timeSpentSec),
          csv(p.lastSeenAt),
          "",
          ""
        ].join(",")
      );
    }
    for (const a of attempts) {
      lines.push(["quiz_attempt", "", "", "", "", String(a.score), csv(a.createdAt)].join(","));
    }
    const blob = new Blob([lines.join("\n") + "\n"], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `somasmart_progress_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function downloadPdfReport() {
    const lines: string[] = [];
    lines.push(`Student: ${u.displayName} (${u.username})`);
    lines.push(`Generated: ${new Date().toLocaleString()}`);
    lines.push("");
    lines.push("Lessons:");
    for (const p of progress) {
      const lessonTitle = lessonsById[p.lessonId]?.title ?? p.lessonId;
      lines.push(
        `- ${lessonTitle} | completed: ${p.completedAt ? "yes" : "no"} | time: ${Math.round(
          p.timeSpentSec / 60
        )} min | last seen: ${new Date(p.lastSeenAt).toLocaleString()}`
      );
    }
    if (progress.length === 0) lines.push("- No activity yet.");
    lines.push("");
    lines.push("Quiz attempts:");
    const sorted = attempts.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    for (const a of sorted) lines.push(`- ${new Date(a.createdAt).toLocaleString()} | score: ${a.score}%`);
    if (attempts.length === 0) lines.push("- No attempts yet.");

    await downloadPdf({
      filename: `somasmart_progress_${new Date().toISOString().slice(0, 10)}.pdf`,
      title: "SomaSmart Progress Report",
      subtitle: "Offline-first report (MVP)",
      lines
    });
  }

  return (
    <div className="space-y-4">
      <Card
        title="Progress"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={downloadCsv}>
              Export CSV
            </Button>
            <Button variant="secondary" onClick={() => void downloadPdfReport()}>
              Export PDF
            </Button>
          </div>
        }
      >
        <div className="overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs text-slate-400">
              <tr>
                <th className="py-2">Lesson</th>
                <th className="py-2">Completed</th>
                <th className="py-2">Time</th>
                <th className="py-2">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {progress.map((p) => (
                <tr key={p.id} className="border-t border-slate-800">
                  <td className="py-2">{lessonsById[p.lessonId]?.title ?? p.lessonId}</td>
                  <td className="py-2">{p.completedAt ? "Yes" : "No"}</td>
                  <td className="py-2">{Math.round(p.timeSpentSec / 60)} min</td>
                  <td className="py-2">{new Date(p.lastSeenAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {progress.length === 0 ? <div className="text-sm text-slate-400">No activity yet.</div> : null}
        </div>
      </Card>

      <Card title="Quiz Attempts">
        <div className="overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs text-slate-400">
              <tr>
                <th className="py-2">Date</th>
                <th className="py-2">Score</th>
              </tr>
            </thead>
            <tbody>
              {attempts
                .slice()
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                .map((a) => (
                  <tr key={a.id} className="border-t border-slate-800">
                    <td className="py-2">{new Date(a.createdAt).toLocaleString()}</td>
                    <td className="py-2">{a.score}%</td>
                  </tr>
                ))}
            </tbody>
          </table>
          {attempts.length === 0 ? <div className="text-sm text-slate-400">No quiz attempts yet.</div> : null}
        </div>
      </Card>
    </div>
  );
}

function csv(v: string) {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes("\"") || s.includes("\n")) {
    return `"${s.replaceAll("\"", "\"\"")}"`;
  }
  return s;
}
