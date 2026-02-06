import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/authContext";
import { getHomePathForUser } from "@/features/auth/homeRoute";
import { LearnLandingPage } from "@/features/content/LearnLandingPage";

export function StartRedirect() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const search = location.search ?? "";

  if (loading && !user) return <div>Loading…</div>;

  if (!user) return <LearnLandingPage />;
  if (user.role === "student") return <LearnLandingPage />;
  return <Navigate to={`${getHomePathForUser(user)}${search}`} replace />;
}
