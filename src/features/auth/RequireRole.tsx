import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import type { Role } from "@/shared/types";
import { useAuth } from "@/features/auth/authContext";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";

export function RequireRole({
  roles,
  requireApproved,
  children
}: {
  roles: Role[];
  requireApproved?: boolean;
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const location = useLocation();
  const search = location.search ?? "";
  const loginTarget = `/login${search}`;
  if (loading && !user) return <div>Loading…</div>;
  if (!user) return <Navigate to={loginTarget} replace />;
  if (!roles.includes(user.role)) return <Navigate to={loginTarget} replace />;

  if (requireApproved && user.role === "teacher" && user.status !== "active") {
    return (
      <Card title="Teacher approval pending">
        <p className="text-sm text-muted">
          Your account is pending admin approval. You can’t upload lessons until you’re approved.
        </p>
        <div className="mt-4">
          <Button variant="secondary" onClick={logout}>
            Logout
          </Button>
        </div>
      </Card>
    );
  }

  return <>{children}</>;
}
