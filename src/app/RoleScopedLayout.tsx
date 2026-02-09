import React, { Suspense, lazy } from "react";
import { useAuth } from "@/features/auth/authContext";

const StudentLayout = lazy(async () => ({ default: (await import("@/features/student/StudentLayout")).StudentLayout }));
const TeacherLayout = lazy(async () => ({ default: (await import("@/features/teacher/TeacherLayout")).TeacherLayout }));
const AdminLayout = lazy(async () => ({ default: (await import("@/features/admin/AdminLayout")).AdminLayout }));
const SchoolLayout = lazy(async () => ({ default: (await import("@/features/school/SchoolLayout")).SchoolLayout }));

function RoleLayoutFallback({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function RoleScopedLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (!user) {
    return <>{children}</>;
  }

  if (user.role === "student") {
    return (
      <Suspense fallback={<RoleLayoutFallback>{children}</RoleLayoutFallback>}>
        <StudentLayout>{children}</StudentLayout>
      </Suspense>
    );
  }

  if (user.role === "teacher") {
    return (
      <Suspense fallback={<RoleLayoutFallback>{children}</RoleLayoutFallback>}>
        <TeacherLayout>{children}</TeacherLayout>
      </Suspense>
    );
  }

  if (user.role === "admin") {
    return (
      <Suspense fallback={<RoleLayoutFallback>{children}</RoleLayoutFallback>}>
        <AdminLayout>{children}</AdminLayout>
      </Suspense>
    );
  }

  if (user.role === "school_admin") {
    return (
      <Suspense fallback={<RoleLayoutFallback>{children}</RoleLayoutFallback>}>
        <SchoolLayout>{children}</SchoolLayout>
      </Suspense>
    );
  }

  return <>{children}</>;
}
