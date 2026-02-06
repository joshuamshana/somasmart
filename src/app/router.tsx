import React from "react";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { AppShell } from "@/app/shell";
import { LoginPage } from "@/features/auth/LoginPage";
import { RegisterPage } from "@/features/auth/RegisterPage";
import { StartRedirect } from "@/features/auth/StartRedirect";
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
import { AdminStudentLessonPreviewPage } from "@/features/admin/AdminStudentLessonPreviewPage";
import { AdminLayout } from "@/features/admin/AdminLayout";
import { SchoolDashboard } from "@/features/school/SchoolDashboard";
import { SchoolUsersPage } from "@/features/school/SchoolUsersPage";
import { SchoolLicensesPage } from "@/features/school/SchoolLicensesPage";
import { SchoolAnalyticsPage } from "@/features/school/SchoolAnalyticsPage";
import { StudentSupportPage } from "@/features/messaging/StudentSupportPage";
import { TeacherSupportPage } from "@/features/messaging/TeacherSupportPage";
import { SyncPage } from "@/features/sync/SyncPage";
import { NotificationsPage } from "@/features/notifications/NotificationsPage";
import { PublicLessonGateRedirect } from "@/features/content/PublicLessonGateRedirect";
import { RouteErrorPage } from "@/app/RouteErrorPage";
import { AppearanceSettingsPage } from "@/features/settings/AppearanceSettingsPage";
import { StudentLayout } from "@/features/student/StudentLayout";
import { PublicLayout } from "@/features/public/PublicLayout";
import { SchoolLayout } from "@/features/school/SchoolLayout";
import { RoleScopedLayout } from "@/app/RoleScopedLayout";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <StartRedirect /> },
      {
        element: <PublicLayout />,
        children: [
          { path: "login", element: <LoginPage /> },
          { path: "register", element: <RegisterPage /> },
          { path: "learn/lessons/:lessonId", element: <PublicLessonGateRedirect /> }
        ]
      },
      {
        path: "student",
        element: (
          <RequireRole roles={["student"]}>
            <StudentLayout />
          </RequireRole>
        ),
        children: [
          {
            index: true,
            element: <Navigate to="/" replace />
          },
          {
            path: "lessons",
            element: <StudentLessonsPage />
          },
          {
            path: "lessons/:lessonId",
            element: <StudentLessonPage />
          },
          {
            path: "progress",
            element: <StudentProgressPage />
          },
          {
            path: "payments",
            element: <StudentPaymentsPage />
          },
          {
            path: "support",
            element: <StudentSupportPage />
          },
          {
            path: "sync",
            element: <SyncPage />
          },
          {
            path: "notifications",
            element: <NotificationsPage />
          },
          {
            path: "appearance",
            element: <AppearanceSettingsPage />
          }
        ]
      },
      {
        path: "sync",
        element: (
          <RequireRole roles={["student", "teacher", "admin", "school_admin"]}>
            <RoleScopedLayout>
              <SyncPage />
            </RoleScopedLayout>
          </RequireRole>
        )
      },
      {
        path: "notifications",
        element: (
          <RequireRole roles={["student", "teacher", "admin", "school_admin"]}>
            <RoleScopedLayout>
              <NotificationsPage />
            </RoleScopedLayout>
          </RequireRole>
        )
      },
      {
        path: "settings/appearance",
        element: (
          <RequireRole roles={["student", "teacher", "admin", "school_admin"]}>
            <RoleScopedLayout>
              <AppearanceSettingsPage />
            </RoleScopedLayout>
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
          { path: "lessons/:lessonId/preview", element: <AdminStudentLessonPreviewPage /> },
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
            <SchoolLayout />
          </RequireRole>
        ),
        children: [
          { index: true, element: <SchoolDashboard /> },
          { path: "users", element: <SchoolUsersPage /> },
          { path: "licenses", element: <SchoolLicensesPage /> },
          { path: "analytics", element: <SchoolAnalyticsPage /> }
        ]
      }
    ]
  }
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
