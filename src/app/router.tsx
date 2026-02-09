import React, { Suspense, lazy } from "react";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { AppShell } from "@/app/shell";
import { RequireRole } from "@/features/auth/RequireRole";

const LoginPage = lazy(() => import("@/features/auth/LoginPage").then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import("@/features/auth/RegisterPage").then((module) => ({ default: module.RegisterPage })));
const StartRedirect = lazy(() => import("@/features/auth/StartRedirect").then((module) => ({ default: module.StartRedirect })));
const StudentLessonsPage = lazy(() =>
  import("@/features/student/StudentLessonsPage").then((module) => ({ default: module.StudentLessonsPage }))
);
const StudentLessonPage = lazy(() =>
  import("@/features/student/StudentLessonPage").then((module) => ({ default: module.StudentLessonPage }))
);
const StudentProgressPage = lazy(() =>
  import("@/features/student/StudentProgressPage").then((module) => ({ default: module.StudentProgressPage }))
);
const StudentPaymentsPage = lazy(() =>
  import("@/features/student/StudentPaymentsPage").then((module) => ({ default: module.StudentPaymentsPage }))
);
const TeacherDashboard = lazy(() =>
  import("@/features/teacher/TeacherDashboard").then((module) => ({ default: module.TeacherDashboard }))
);
const TeacherLessonsPage = lazy(() =>
  import("@/features/teacher/TeacherLessonsPage").then((module) => ({ default: module.TeacherLessonsPage }))
);
const TeacherLessonBuilderPage = lazy(() =>
  import("@/features/teacher/TeacherLessonBuilderPage").then((module) => ({ default: module.TeacherLessonBuilderPage }))
);
const TeacherLayout = lazy(() => import("@/features/teacher/TeacherLayout").then((module) => ({ default: module.TeacherLayout })));
const AdminDashboard = lazy(() => import("@/features/admin/AdminDashboard").then((module) => ({ default: module.AdminDashboard })));
const AdminTeachersPage = lazy(() =>
  import("@/features/admin/AdminTeachersPage").then((module) => ({ default: module.AdminTeachersPage }))
);
const AdminStudentsPage = lazy(() =>
  import("@/features/admin/AdminStudentsPage").then((module) => ({ default: module.AdminStudentsPage }))
);
const AdminLessonsPage = lazy(() =>
  import("@/features/admin/AdminLessonsPage").then((module) => ({ default: module.AdminLessonsPage }))
);
const AdminLessonReviewPage = lazy(() =>
  import("@/features/admin/AdminLessonReviewPage").then((module) => ({ default: module.AdminLessonReviewPage }))
);
const AdminCouponsPage = lazy(() =>
  import("@/features/admin/AdminCouponsPage").then((module) => ({ default: module.AdminCouponsPage }))
);
const AdminAnalyticsPage = lazy(() =>
  import("@/features/admin/AdminAnalyticsPage").then((module) => ({ default: module.AdminAnalyticsPage }))
);
const AdminPaymentsPage = lazy(() =>
  import("@/features/admin/AdminPaymentsPage").then((module) => ({ default: module.AdminPaymentsPage }))
);
const AdminSchoolsPage = lazy(() => import("@/features/admin/AdminSchoolsPage").then((module) => ({ default: module.AdminSchoolsPage })));
const AdminAuditPage = lazy(() => import("@/features/admin/AdminAuditPage").then((module) => ({ default: module.AdminAuditPage })));
const AdminLicensesPage = lazy(() =>
  import("@/features/admin/AdminLicensesPage").then((module) => ({ default: module.AdminLicensesPage }))
);
const AdminSettingsPage = lazy(() =>
  import("@/features/admin/AdminSettingsPage").then((module) => ({ default: module.AdminSettingsPage }))
);
const AdminSchoolAdminsPage = lazy(() =>
  import("@/features/admin/AdminSchoolAdminsPage").then((module) => ({ default: module.AdminSchoolAdminsPage }))
);
const AdminAdminsPage = lazy(() => import("@/features/admin/AdminAdminsPage").then((module) => ({ default: module.AdminAdminsPage })));
const AdminSupportPage = lazy(() =>
  import("@/features/admin/AdminSupportPage").then((module) => ({ default: module.AdminSupportPage }))
);
const AdminStudentLessonPreviewPage = lazy(() =>
  import("@/features/admin/AdminStudentLessonPreviewPage").then((module) => ({ default: module.AdminStudentLessonPreviewPage }))
);
const AdminLayout = lazy(() => import("@/features/admin/AdminLayout").then((module) => ({ default: module.AdminLayout })));
const SchoolDashboard = lazy(() =>
  import("@/features/school/SchoolDashboard").then((module) => ({ default: module.SchoolDashboard }))
);
const SchoolUsersPage = lazy(() => import("@/features/school/SchoolUsersPage").then((module) => ({ default: module.SchoolUsersPage })));
const SchoolLicensesPage = lazy(() =>
  import("@/features/school/SchoolLicensesPage").then((module) => ({ default: module.SchoolLicensesPage }))
);
const SchoolAnalyticsPage = lazy(() =>
  import("@/features/school/SchoolAnalyticsPage").then((module) => ({ default: module.SchoolAnalyticsPage }))
);
const StudentSupportPage = lazy(() =>
  import("@/features/messaging/StudentSupportPage").then((module) => ({ default: module.StudentSupportPage }))
);
const TeacherSupportPage = lazy(() =>
  import("@/features/messaging/TeacherSupportPage").then((module) => ({ default: module.TeacherSupportPage }))
);
const SyncPage = lazy(() => import("@/features/sync/SyncPage").then((module) => ({ default: module.SyncPage })));
const NotificationsPage = lazy(() =>
  import("@/features/notifications/NotificationsPage").then((module) => ({ default: module.NotificationsPage }))
);
const PublicLessonGateRedirect = lazy(() =>
  import("@/features/content/PublicLessonGateRedirect").then((module) => ({ default: module.PublicLessonGateRedirect }))
);
const RouteErrorPage = lazy(() => import("@/app/RouteErrorPage").then((module) => ({ default: module.RouteErrorPage })));
const AppearanceSettingsPage = lazy(() =>
  import("@/features/settings/AppearanceSettingsPage").then((module) => ({ default: module.AppearanceSettingsPage }))
);
const StudentLayout = lazy(() => import("@/features/student/StudentLayout").then((module) => ({ default: module.StudentLayout })));
const PublicLayout = lazy(() => import("@/features/public/PublicLayout").then((module) => ({ default: module.PublicLayout })));
const SchoolLayout = lazy(() => import("@/features/school/SchoolLayout").then((module) => ({ default: module.SchoolLayout })));
const RoleScopedLayout = lazy(() => import("@/app/RoleScopedLayout").then((module) => ({ default: module.RoleScopedLayout })));

function lazyPage(element: React.ReactElement) {
  return <Suspense fallback={<div className="p-4 text-sm text-muted">Loading...</div>}>{element}</Suspense>;
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    errorElement: lazyPage(<RouteErrorPage />),
    children: [
      { index: true, element: lazyPage(<StartRedirect />) },
      {
        element: lazyPage(<PublicLayout />),
        children: [
          { path: "login", element: lazyPage(<LoginPage />) },
          { path: "register", element: lazyPage(<RegisterPage />) },
          { path: "learn/lessons/:lessonId", element: lazyPage(<PublicLessonGateRedirect />) }
        ]
      },
      {
        path: "student",
        element: lazyPage(
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
            element: lazyPage(<StudentLessonsPage />)
          },
          {
            path: "lessons/:lessonId",
            element: lazyPage(<StudentLessonPage />)
          },
          {
            path: "progress",
            element: lazyPage(<StudentProgressPage />)
          },
          {
            path: "payments",
            element: lazyPage(<StudentPaymentsPage />)
          },
          {
            path: "support",
            element: lazyPage(<StudentSupportPage />)
          },
          {
            path: "sync",
            element: lazyPage(<SyncPage />)
          },
          {
            path: "notifications",
            element: lazyPage(<NotificationsPage />)
          },
          {
            path: "appearance",
            element: lazyPage(<AppearanceSettingsPage />)
          }
        ]
      },
      {
        path: "sync",
        element: lazyPage(
          <RequireRole roles={["student", "teacher", "admin", "school_admin"]}>
            <RoleScopedLayout>
              <SyncPage />
            </RoleScopedLayout>
          </RequireRole>
        )
      },
      {
        path: "notifications",
        element: lazyPage(
          <RequireRole roles={["student", "teacher", "admin", "school_admin"]}>
            <RoleScopedLayout>
              <NotificationsPage />
            </RoleScopedLayout>
          </RequireRole>
        )
      },
      {
        path: "settings/appearance",
        element: lazyPage(
          <RequireRole roles={["student", "teacher", "admin", "school_admin"]}>
            <RoleScopedLayout>
              <AppearanceSettingsPage />
            </RoleScopedLayout>
          </RequireRole>
        )
      },
      {
        path: "teacher",
        element: lazyPage(
          <RequireRole roles={["teacher"]} requireApproved>
            <TeacherLayout />
          </RequireRole>
        ),
        children: [
          { index: true, element: lazyPage(<TeacherDashboard />) },
          { path: "lessons", element: lazyPage(<TeacherLessonsPage />) },
          { path: "lessons/new", element: lazyPage(<TeacherLessonBuilderPage />) },
          { path: "lessons/:lessonId/edit", element: lazyPage(<TeacherLessonBuilderPage />) },
          { path: "support", element: lazyPage(<TeacherSupportPage />) }
        ]
      },
      {
        path: "admin",
        element: lazyPage(
          <RequireRole roles={["admin"]}>
            <AdminLayout />
          </RequireRole>
        ),
        children: [
          { index: true, element: lazyPage(<AdminDashboard />) },
          { path: "teachers", element: lazyPage(<AdminTeachersPage />) },
          { path: "students", element: lazyPage(<AdminStudentsPage />) },
          { path: "school-admins", element: lazyPage(<AdminSchoolAdminsPage />) },
          { path: "admins", element: lazyPage(<AdminAdminsPage />) },
          { path: "lessons", element: lazyPage(<AdminLessonsPage />) },
          { path: "lessons/:lessonId/review", element: lazyPage(<AdminLessonReviewPage />) },
          { path: "lessons/:lessonId/preview", element: lazyPage(<AdminStudentLessonPreviewPage />) },
          { path: "coupons", element: lazyPage(<AdminCouponsPage />) },
          { path: "analytics", element: lazyPage(<AdminAnalyticsPage />) },
          { path: "payments", element: lazyPage(<AdminPaymentsPage />) },
          { path: "licenses", element: lazyPage(<AdminLicensesPage />) },
          { path: "schools", element: lazyPage(<AdminSchoolsPage />) },
          { path: "audit", element: lazyPage(<AdminAuditPage />) },
          { path: "settings", element: lazyPage(<AdminSettingsPage />) },
          { path: "support", element: lazyPage(<AdminSupportPage />) }
        ]
      },
      {
        path: "school",
        element: lazyPage(
          <RequireRole roles={["school_admin"]}>
            <SchoolLayout />
          </RequireRole>
        ),
        children: [
          { index: true, element: lazyPage(<SchoolDashboard />) },
          { path: "users", element: lazyPage(<SchoolUsersPage />) },
          { path: "licenses", element: lazyPage(<SchoolLicensesPage />) },
          { path: "analytics", element: lazyPage(<SchoolAnalyticsPage />) }
        ]
      }
    ]
  }
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
