import React, { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/authContext";
import { db } from "@/shared/db/db";
import type { Notification } from "@/shared/types";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";

function nowIso() {
  return new Date().toISOString();
}

export function NotificationsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);

  async function refresh() {
    if (!user) return;
    const all = (await db.notifications.toArray())
      .filter((n) => n.userId === user.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    setItems(all);
  }

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 2000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (!user) return null;

  async function markAllRead() {
    const unread = items.filter((n) => !n.readAt);
    if (unread.length === 0) return;
    await db.transaction("rw", db.notifications, async () => {
      for (const n of unread) await db.notifications.update(n.id, { readAt: nowIso() });
    });
    await refresh();
  }

  async function markRead(id: string) {
    await db.notifications.update(id, { readAt: nowIso() });
    await refresh();
  }

  return (
    <div className="space-y-4">
      <Card
        title="Notifications"
        actions={
          <Button variant="secondary" onClick={() => void markAllRead()}>
            Mark all read
          </Button>
        }
      >
        <div className="space-y-3">
          {items.map((n) => (
            <div key={n.id} className="rounded-lg border border-border bg-surface p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">{n.title}</div>
                  {n.body ? <div className="mt-1 text-sm text-muted">{n.body}</div> : null}
                  <div className="mt-2 text-xs text-muted">{new Date(n.createdAt).toLocaleString()}</div>
                </div>
                {!n.readAt ? (
                  <Button variant="secondary" onClick={() => void markRead(n.id)}>
                    Mark read
                  </Button>
                ) : (
                  <div className="rounded bg-surface2 px-2 py-1 text-xs text-muted">read</div>
                )}
              </div>
            </div>
          ))}
          {items.length === 0 ? <div className="text-sm text-muted">No notifications yet.</div> : null}
        </div>
      </Card>
    </div>
  );
}

