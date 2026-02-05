import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/features/auth/authContext";
import { Card } from "@/shared/ui/Card";
import { Select } from "@/shared/ui/Select";
import { Button } from "@/shared/ui/Button";
import { db } from "@/shared/db/db";
import type { Message, User } from "@/shared/types";
import { enqueueOutboxEvent } from "@/shared/offline/outbox";

function nowIso() {
  return new Date().toISOString();
}

function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function TeacherSupportPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<User[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [blockedReason, setBlockedReason] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) return;
      const users = await db.users.toArray();
      const s = users.filter(
        (u) =>
          u.role === "student" &&
          (!user.schoolId || u.schoolId === user.schoolId)
      );
      if (cancelled) return;
      setStudents(s);
      if (!selectedStudentId && s[0]) setSelectedStudentId(s[0].id);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, selectedStudentId]);

  const refreshMessages = useCallback(
    async (peerId: string) => {
      const userId = user?.id;
      if (!userId) return;
      const all = await db.messages.toArray();
      const thread = all
        .filter(
          (m) =>
            (m.fromUserId === userId && m.toUserId === peerId) ||
            (m.fromUserId === peerId && m.toUserId === userId)
        )
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      setMessages(thread);
    },
    [user?.id]
  );

  useEffect(() => {
    if (!selectedStudentId) return;
    void refreshMessages(selectedStudentId);
    const id = window.setInterval(() => void refreshMessages(selectedStudentId), 1000);
    return () => window.clearInterval(id);
  }, [selectedStudentId, refreshMessages]);

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId) ?? null,
    [students, selectedStudentId]
  );

  if (!user) return null;
  const userId = user.id;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!selectedStudent) {
        setBlockedReason(null);
        return;
      }
      if (!selectedStudent.isMinor) {
        setBlockedReason(null);
        return;
      }
      const school = selectedStudent.schoolId ? await db.schools.get(selectedStudent.schoolId) : null;
      const allowed = Boolean(school?.messagingEnabledForMinors);
      if (cancelled) return;
      setBlockedReason(allowed ? null : "Messaging is disabled for minors by school/admin settings.");
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedStudent?.id, selectedStudent?.isMinor, selectedStudent?.schoolId]);

  async function send() {
    const body = draft.trim();
    if (!body || !selectedStudentId) return;
    if (blockedReason) return;
    const msg: Message = {
      id: newId("msg"),
      fromUserId: userId,
      toUserId: selectedStudentId,
      body,
      createdAt: nowIso(),
      status: "queued",
      supportStatus: "open"
    };
    await db.messages.add(msg);
    await enqueueOutboxEvent({ type: "message_send", payload: { messageId: msg.id } });
    setDraft("");
    await refreshMessages(selectedStudentId);
  }

  return (
    <div className="space-y-4">
      <Card title="Support (offline messaging)">
        <div className="grid gap-3 md:grid-cols-2">
          <Select
            label="Student"
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.displayName} ({s.username})
              </option>
            ))}
          </Select>
          <div className="self-end text-xs text-slate-400">
            Messages are stored locally and synced later (sync not implemented in MVP).
          </div>
        </div>
      </Card>

      <Card title={selectedStudent ? `Conversation with ${selectedStudent.displayName}` : "Conversation"}>
        <div className="max-h-[50vh] space-y-2 overflow-auto rounded border border-slate-800 p-3">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`rounded-lg px-3 py-2 text-sm ${
                m.fromUserId === user.id ? "bg-sky-950 text-sky-100" : "bg-slate-900 text-slate-200"
              }`}
            >
              <div className="text-xs text-slate-400">{new Date(m.createdAt).toLocaleString()}</div>
              <div className="mt-1 whitespace-pre-wrap">{m.body}</div>
              <div className="mt-1 text-[11px] text-slate-500">Status: {m.status}</div>
            </div>
          ))}
          {messages.length === 0 ? <div className="text-sm text-slate-400">No messages yet.</div> : null}
        </div>
        {blockedReason ? <div className="mt-3 text-sm text-amber-200">{blockedReason}</div> : null}
        <div className="mt-3 flex gap-2">
          <textarea
            className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type a message…"
            disabled={Boolean(blockedReason)}
          />
          <Button onClick={() => void send()} disabled={Boolean(blockedReason)}>
            Send
          </Button>
        </div>
      </Card>
    </div>
  );
}
