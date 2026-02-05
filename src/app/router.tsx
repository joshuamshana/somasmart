import React from "react";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { AppShell } from "@/app/shell";
import { LoginPage } from "@/features/auth/LoginPage";
import { RegisterPage } from "@/features/auth/RegisterPage";
import { RequireRole } from "@/features/auth/RequireRole";
import { StudentDashboard } from "@/features/student/StudentDashboard";
import { StudentLessonsPage } from "@/features/student/StudentLessonsPage";
import { StudentLessonPage } from "@/features/student/StudentLessonPage";
import { StudentProgressPage } from "@/features/student/StudentProgressPage";
import { StudentPaymentsPage } from "@/features/student/StudentPaymentsPage";
import { TeacherDashboard } from "@/features/teacher/TeacherDashboard";
import { TeacherLessonsPage } from "@/features/teacher/TeacherLessonsPage";
import { TeacherLessonBuilderPage } from "@/features/teacher/TeacherLessonBuilderPage";
import { TeacherLayout } from "@/features/teacher/TeacherLayout";
import { AdminDashboard } from "@/features/admin/AdminDashboard";
import { AdminTeachersPage } from "@/features/admin/AdminTeachersPage";
import { AdminStudentsPage } from "@/features/admin/AdminStudentsPage";
import { AdminLessonsPage } from "@/features/admin/AdminLessonsPage";
import { AdminCouponsPage } from "@/features/admin/AdminCouponsPage";
import { AdminAnalyticsPage } from "@/features/admin/AdminAnalyticsPage";
import { AdminPaymentsPage } from "@/features/admin/AdminPaymentsPage";
import { AdminSchoolsPage } from "@/features/admin/AdminSchoolsPage";
import { AdminAuditPage } from "@/features/admin/AdminAuditPage";
import { AdminLicensesPage } from "@/features/admin/AdminLicensesPage";
import { AdminSettingsPage } from "@/features/admin/AdminSettingsPage";
import { AdminSchoolAdminsPage } from "@/features/admin/AdminSchoolAdminsPage";
import { AdminAdminsPage } from "@/features/admin/AdminAdminsPage";
import { AdminSupportPage } from "@/features/admin/AdminSupportPage";
import { AdminLayout } from "@/features/admin/AdminLayout";
import { SchoolDashboard } from "@/features/school/SchoolDashboard";
import { SchoolUsersPage } from "@/features/school/SchoolUsersPage";
import { SchoolLicensesPage } from "@/features/school/SchoolLicensesPage";
import { SchoolAnalyticsPage } from "@/features/school/SchoolAnalyticsPage";
import { StudentSupportPage } from "@/features/messaging/StudentSupportPage";
import { TeacherSupportPage } from "@/features/messaging/TeacherSupportPage";
import { SyncPage } from "@/features/sync/SyncPage";
import { NotificationsPage } from "@/features/notifications/NotificationsPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/login" replace /> },
      { path: "login", element: <LoginPage /> },
      { path: "register", element: <RegisterPage /> },
      {
        path: "student",
        element: (
          <RequireRole roles={["student"]}>
            <StudentDashboard />
          </RequireRole>
        )
      },
      {
        path: "student/lessons",
        element: (
          <RequireRole roles={["student"]}>
            <StudentLessonsPage />
          </RequireRole>
        )
      },
      {
        path: "student/lessons/:lessonId",
        element: (
          <RequireRole roles={["student"]}>
            <StudentLessonPage />
          </RequireRole>
        )
      },
      {
        path: "student/progress",
        element: (
          <RequireRole roles={["student"]}>
            <StudentProgressPage />
          </RequireRole>
        )
      },
      {
        path: "student/payments",
        element: (
          <RequireRole roles={["student"]}>
            <StudentPaymentsPage />
          </RequireRole>
        )
      },
      {
        path: "student/support",
        element: (
          <RequireRole roles={["student"]}>
            <StudentSupportPage />
          </RequireRole>
        )
      },
      {
        path: "sync",
        element: (
          <RequireRole roles={["student", "teacher", "admin", "school_admin"]}>
            <SyncPage />
          </RequireRole>
        )
      },
      {
        path: "notifications",
        element: (
          <RequireRole roles={["student", "teacher", "admin", "school_admin"]}>
            <NotificationsPage />
          </RequireRole>
        )
      },
      {
        path: "teacher",
        element: (
          <RequireRole roles={["teacher"]} requireApproved>
            <TeacherLayout />
          </RequireRole>
        ),
        children: [
          { index: true, element: <TeacherDashboard /> },
          { path: "lessons", element: <TeacherLessonsPage /> },
          { path: "lessons/new", element: <TeacherLessonBuilderPage /> },
          { path: "lessons/:lessonId/edit", element: <TeacherLessonBuilderPage /> },
          { path: "support", element: <TeacherSupportPage /> }
        ]
      },
      {
        path: "admin",
        element: (
          <RequireRole roles={["admin"]}>
            <AdminLayout />
          </RequireRole>
        ),
        children: [
          { index: true, element: <AdminDashboard /> },
          { path: "teachers", element: <AdminTeachersPage /> },
          { path: "students", element: <AdminStudentsPage /> },
          { path: "school-admins", element: <AdminSchoolAdminsPage /> },
          { path: "admins", element: <AdminAdminsPage /> },
          { path: "lessons", element: <AdminLessonsPage /> },
          { path: "coupons", element: <AdminCouponsPage /> },
          { path: "analytics", element: <AdminAnalyticsPage /> },
          { path: "payments", element: <AdminPaymentsPage /> },
          { path: "licenses", element: <AdminLicensesPage /> },
          { path: "schools", element: <AdminSchoolsPage /> },
          { path: "audit", element: <AdminAuditPage /> },
          { path: "settings", element: <AdminSettingsPage /> },
          { path: "support", element: <AdminSupportPage /> }
        ]
      },
      {
        path: "school",
        element: (
          <RequireRole roles={["school_admin"]}>
            <SchoolDashboard />
          </RequireRole>
        )
      },
      {
        path: "school/users",
        element: (
          <RequireRole roles={["school_admin"]}>
            <SchoolUsersPage />
          </RequireRole>
        )
      },
      {
        path: "school/licenses",
        element: (
          <RequireRole roles={["school_admin"]}>
            <SchoolLicensesPage />
          </RequireRole>
        )
      },
      {
        path: "school/analytics",
        element: (
          <RequireRole roles={["school_admin"]}>
            <SchoolAnalyticsPage />
          </RequireRole>
        )
      }
    ]
  }
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
