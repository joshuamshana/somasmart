import React, { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { OfflineBanner } from "@/shared/offline/OfflineBanner";
import { useAuth } from "@/features/auth/authContext";
import { db } from "@/shared/db/db";
import { ToastViewport } from "@/shared/ui/Toast";

function NavLink({
  to,
  children
}: {
  to: string;
  children: React.ReactNode;
}) {
  const location = useLocation();
  const target = location.search && !to.includes("?") ? `${to}${location.search}` : to;
  const active = location.pathname === to;
  return (
    <Link
      to={target}
      className={`rounded px-3 py-2 text-sm ${active ? "bg-surface2" : "hover:bg-surface2/60"}`}
    >
      {children}
    </Link>
  );
}

export function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const homeTarget = location.search ? `/${location.search}` : "/";
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      if (!user) {
        setUnreadCount(0);
        return;
      }
      const all = await db.notifications.toArray();
      const unread = all.filter((n) => n.userId === user.id && !n.readAt).length;
      if (cancelled) return;
      setUnreadCount(unread);
    }
    void refresh();
    const id = window.setInterval(() => void refresh(), 2000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [user?.id]);
  return (
    <div className="min-h-full">
      <OfflineBanner />
      <ToastViewport />
      <header className="sticky top-0 z-10 border-b border-border bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to={homeTarget} className="font-semibold">
            SomaSmart
          </Link>
          <nav className="flex items-center gap-2">
            {!user ? (
              <>
                <NavLink to="/login">Login</NavLink>
                <NavLink to="/register">Register</NavLink>
              </>
            ) : (
              <>
                {user.role === "student" && (
                  <>
                    <NavLink to="/">Dashboard</NavLink>
                    <NavLink to="/student/lessons">Lessons</NavLink>
                    <NavLink to="/student/progress">Progress</NavLink>
                    <NavLink to="/student/payments">Payments</NavLink>
                    <NavLink to="/student/support">Support</NavLink>
                    <NavLink to="/sync">Sync</NavLink>
                  </>
                )}
                {user.role === "teacher" && (
                  <div className="hidden lg:flex items-center gap-2">
                    <NavLink to="/teacher">Dashboard</NavLink>
                    <NavLink to="/teacher/lessons">My Lessons</NavLink>
                    <NavLink to="/teacher/lessons/new">Upload Lesson</NavLink>
                    <NavLink to="/teacher/support">Support</NavLink>
                    <NavLink to="/sync">Sync</NavLink>
                  </div>
                )}
                {user.role === "school_admin" && (
                  <>
                    <NavLink to="/school">School</NavLink>
                    <NavLink to="/school/users">Users</NavLink>
                    <NavLink to="/school/licenses">Licenses</NavLink>
                    <NavLink to="/school/analytics">Analytics</NavLink>
                    <NavLink to="/sync">Sync</NavLink>
                  </>
                )}
                <NavLink to="/notifications">
                  <span className="inline-flex items-center gap-2">
                    Notifications
                    {unreadCount > 0 ? (
                      <span className="rounded bg-brand px-2 py-0.5 text-xs text-brand-contrast">{unreadCount}</span>
                    ) : null}
                  </span>
                </NavLink>
                <NavLink to="/settings/appearance">Appearance</NavLink>
                <button
                  className="rounded bg-surface2 px-3 py-2 text-sm hover:bg-surface2/80"
                  onClick={logout}
                >
                  Logout
                </button>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
