import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/authContext";
import { Card } from "@/shared/ui/Card";
import { db } from "@/shared/db/db";
import { getSchoolById } from "@/shared/db/schoolsRepo";

export function SchoolDashboard() {
  const { user } = useAuth();
  const [schoolName, setSchoolName] = useState<string>("");
  const [schoolCode, setSchoolCode] = useState<string>("");
  const [messagingForMinors, setMessagingForMinors] = useState(false);
  const [stats, setStats] = useState({ students: 0, teachers: 0 });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.schoolId) return;
      const school = await getSchoolById(user.schoolId);
      const users = await db.users.toArray();
      const students = users.filter((u) => u.schoolId === user.schoolId && u.role === "student").length;
      const teachers = users.filter((u) => u.schoolId === user.schoolId && u.role === "teacher").length;
      if (cancelled) return;
      setSchoolName(school?.name ?? "School");
      setSchoolCode(school?.code ?? "");
      setMessagingForMinors(Boolean(school?.messagingEnabledForMinors));
      setStats({ students, teachers });
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) return null;
  const schoolId = user.schoolId;

  async function saveMessagingSetting(next: boolean) {
    if (!schoolId) return;
    const school = await db.schools.get(schoolId);
    if (!school) return;
    await db.schools.put({ ...school, messagingEnabledForMinors: next });
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card title="School">
        <div className="text-sm text-muted">{schoolName}</div>
        {schoolCode ? (
          <div className="mt-2 text-xs text-muted">
            School code: <span className="font-mono">{schoolCode}</span>
          </div>
        ) : null}
        <div className="mt-3 space-y-1 text-sm">
          <Link className="text-link hover:underline" to="/school/users">
            Manage users
          </Link>
          <div>
            <Link className="text-link hover:underline" to="/school/licenses">
              Manage licenses
            </Link>
          </div>
          <div>
            <Link className="text-link hover:underline" to="/school/analytics">
              View analytics
            </Link>
          </div>
        </div>
        <div className="mt-4 border-t border-border pt-3">
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={messagingForMinors}
              onChange={(e) => {
                const next = e.target.checked;
                setMessagingForMinors(next);
                void saveMessagingSetting(next);
              }}
            />
            Enable messaging for minors
          </label>
          <div className="mt-1 text-xs text-muted">If off, student support chat is blocked for minor accounts.</div>
        </div>
      </Card>
      <Card title="Students">{stats.students}</Card>
      <Card title="Teachers">{stats.teachers}</Card>
    </div>
  );
}
