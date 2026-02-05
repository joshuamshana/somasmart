import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/shared/ui/Card";
import { db } from "@/shared/db/db";
import { PageHeader } from "@/shared/ui/PageHeader";

export function AdminDashboard() {
  const [stats, setStats] = useState({ pendingTeachers: 0, pendingLessons: 0, approvedLessons: 0 });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const users = await db.users.toArray();
      const lessons = await db.lessons.toArray();
      const pendingTeachers = users.filter((u) => u.role === "teacher" && u.status === "pending").length;
      const pendingLessons = lessons.filter((l) => l.status === "pending_approval").length;
      const approvedLessons = lessons.filter((l) => l.status === "approved").length;
      if (cancelled) return;
      setStats({ pendingTeachers, pendingLessons, approvedLessons });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-4">
      <PageHeader title="Admin dashboard" description="Manage users, content approvals, payments, and system settings." />
      <div className="grid gap-4 md:grid-cols-3">
      <Card title="Quick actions">
        <div className="space-y-2 text-sm">
          <Link className="text-brand hover:underline" to="/admin/teachers">
            Review teacher approvals
          </Link>
          <Link className="text-brand hover:underline" to="/admin/lessons">
            Review pending lessons
          </Link>
        </div>
      </Card>
      <Card title="Pending teachers">{stats.pendingTeachers}</Card>
      <Card title="Pending lessons">{stats.pendingLessons}</Card>
      <Card title="Approved lessons">{stats.approvedLessons}</Card>
      </div>
    </div>
  );
}
