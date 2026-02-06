import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/authContext";
import { getHomePathForUser } from "@/features/auth/homeRoute";
import { LearnLandingPage } from "@/features/content/LearnLandingPage";
import { StudentLayout } from "@/features/student/StudentLayout";
import { PublicLayout } from "@/features/public/PublicLayout";

export function StartRedirect() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const search = location.search ?? "";

  if (loading && !user) return <PublicLayout>Loading…</PublicLayout>;

  if (!user) return <PublicLayout><LearnLandingPage /></PublicLayout>;
  if (user.role === "student") return <StudentLayout><LearnLandingPage /></StudentLayout>;
  return <Navigate to={`${getHomePathForUser(user)}${search}`} replace />;
}
