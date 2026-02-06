import React from "react";
import { useAuth } from "@/features/auth/authContext";
import { StudentLayout } from "@/features/student/StudentLayout";
import { TeacherLayout } from "@/features/teacher/TeacherLayout";
import { AdminLayout } from "@/features/admin/AdminLayout";
import { SchoolLayout } from "@/features/school/SchoolLayout";

export function RoleScopedLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (!user) {
    return <>{children}</>;
  }

  if (user.role === "student") {
    return <StudentLayout>{children}</StudentLayout>;
  }

  if (user.role === "teacher") {
    return <TeacherLayout>{children}</TeacherLayout>;
  }

  if (user.role === "admin") {
    return <AdminLayout>{children}</AdminLayout>;
  }

  if (user.role === "school_admin") {
    return <SchoolLayout>{children}</SchoolLayout>;
  }

  return <>{children}</>;
}
