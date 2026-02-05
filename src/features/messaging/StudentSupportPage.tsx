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

export function StudentSupportPage() {
  const { user } = useAuth();
  const [teachers, setTeachers] = useState<User[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [messagingBlocked, setMessagingBlocked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) return;
      if (user.isMinor) {
        const school = user.schoolId ? await db.schools.get(user.schoolId) : null;
        const allowed = Boolean(school?.messagingEnabledForMinors);
        if (!allowed) {
          if (!cancelled) setMessagingBlocked(true);
          return;
        }
      }
      if (!cancelled) setMessagingBlocked(false);
      const users = await db.users.toArray();
      const t = users.filter(
        (u) =>
          u.role === "teacher" &&
          u.status === "active" &&
          (!user.schoolId || u.schoolId === user.schoolId)
      );
      if (cancelled) return;
      setTeachers(t);
      if (!selectedTeacherId && t[0]) setSelectedTeacherId(t[0].id);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, selectedTeacherId]);

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
    if (!selectedTeacherId) return;
    void refreshMessages(selectedTeacherId);
    const id = window.setInterval(() => void refreshMessages(selectedTeacherId), 1000);
    return () => window.clearInterval(id);
  }, [selectedTeacherId, refreshMessages]);

  const selectedTeacher = useMemo(
    () => teachers.find((t) => t.id === selectedTeacherId) ?? null,
    [teachers, selectedTeacherId]
  );

  if (!user) return null;
  if (messagingBlocked) {
    return (
      <Card title="Support">
        <div className="text-sm text-slate-300">
          Messaging is disabled for minors by your school/admin settings.
        </div>
      </Card>
    );
  }
  const userId = user.id;

  async function send() {
    const body = draft.trim();
    if (!body || !selectedTeacherId) return;
    const msg: Message = {
      id: newId("msg"),
      fromUserId: userId,
      toUserId: selectedTeacherId,
      body,
      createdAt: nowIso(),
      status: "queued",
      supportStatus: "open"
    };
    await db.messages.add(msg);
    await enqueueOutboxEvent({ type: "message_send", payload: { messageId: msg.id } });
    setDraft("");
    await refreshMessages(selectedTeacherId);
  }

  return (
    <div className="space-y-4">
      <Card title="Support (offline messaging)">
        <div className="grid gap-3 md:grid-cols-2">
          <Select
            label="Teacher"
            value={selectedTeacherId}
            onChange={(e) => setSelectedTeacherId(e.target.value)}
          >
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.displayName} ({t.username})
              </option>
            ))}
          </Select>
          <div className="self-end text-xs text-slate-400">
            Messages are stored locally and synced later (sync not implemented in MVP).
          </div>
        </div>
      </Card>

      <Card title={selectedTeacher ? `Conversation with ${selectedTeacher.displayName}` : "Conversation"}>
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
        <div className="mt-3 flex gap-2">
          <textarea
            className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type a message…"
          />
          <Button onClick={() => void send()}>Send</Button>
        </div>
      </Card>
    </div>
  );
}
