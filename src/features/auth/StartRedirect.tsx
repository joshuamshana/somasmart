import React, { Suspense, lazy } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/authContext";
import { getHomePathForUser } from "@/features/auth/homeRoute";
import { LearnLandingPage } from "@/features/content/LearnLandingPage";

const StudentLayout = lazy(async () => ({ default: (await import("@/features/student/StudentLayout")).StudentLayout }));
const PublicLayout = lazy(async () => ({ default: (await import("@/features/public/PublicLayout")).PublicLayout }));

export function StartRedirect() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const search = location.search ?? "";

  if (loading && !user) {
    return (
      <Suspense fallback={<div className="p-4 text-sm text-muted">Loading…</div>}>
        <PublicLayout>Loading…</PublicLayout>
      </Suspense>
    );
  }

  if (!user) {
    return (
      <Suspense fallback={<div className="p-4 text-sm text-muted">Loading…</div>}>
        <PublicLayout>
          <LearnLandingPage />
        </PublicLayout>
      </Suspense>
    );
  }
  if (user.role === "student") {
    return (
      <Suspense fallback={<div className="p-4 text-sm text-muted">Loading…</div>}>
        <StudentLayout>
          <LearnLandingPage />
        </StudentLayout>
      </Suspense>
    );
  }
  return <Navigate to={`${getHomePathForUser(user)}${search}`} replace />;
}
