import React from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";

// Backward-compatible route: previously public lessons could be opened at /learn/lessons/:lessonId.
// Now, all lesson viewing requires login.
export function PublicLessonGateRedirect() {
  const params = useParams();
  const location = useLocation();
  const search = location.search ?? "";
  const lessonId = params.lessonId ?? "";

  const nextPath = `/student/lessons/${lessonId}${search}`;
  const join = search.includes("?") ? "&" : "?";
  return <Navigate to={`/login${search}${join}next=${encodeURIComponent(nextPath)}`} replace />;
}

