# Coverage Matrix

Trace requirements to implementation and tests. Status meanings:
- `done`: implemented + covered by at least one meaningful test (unit/RTL/e2e)
- `partial`: implemented but test coverage incomplete, tests are failing in the full suite, or only smoke-level coverage
- `planned`: not implemented yet (listed for the next move)

| Requirement | Implementation | Tests | Status |
|---|---|---|---|
| REQ-0001 | `src/main.tsx`, `src/app/router.tsx` | `e2e/p0.spec.ts` | done |
| REQ-0002 | `src/shared/offline/OfflineBanner.tsx` | `e2e/sync.spec.ts` | done |
| REQ-0003 | `vitest`, `src/**/*.test.ts` | `npm test` | done |
| REQ-0004 | `playwright.config.ts`, `e2e/*` | `npm run test:e2e` | done |
| REQ-0101 | `src/features/auth/*` | `e2e/p0.spec.ts` | done |
| REQ-0102 | `src/features/auth/RegisterPage.tsx`, `src/features/school/SchoolUsersPage.tsx`, `src/features/admin/AdminTeachersPage.tsx` | `e2e/p0.spec.ts`, `e2e/sync.spec.ts` | done |
| REQ-0106 | `src/features/auth/RegisterPage.tsx`, `src/features/auth/authContext.tsx` | `e2e/p0.spec.ts` | done |
| REQ-0107 | `src/features/school/SchoolUsersPage.tsx`, `src/shared/sync/*` | `e2e/sync.spec.ts`, `e2e/notifications.spec.ts` | done |
| REQ-0103 | `src/shared/db/seed.ts`, `src/features/auth/*` | `e2e/*` (admin logins) | done |
| REQ-0104 | `src/app/router.tsx`, `src/features/auth/RequireRole.tsx` | `e2e/*` (role flows) | done |
| REQ-0105 | `src/features/auth/*`, `src/shared/sync/*` | `e2e/sync.spec.ts` | done |
| REQ-0150 | `src/features/content/LearnLandingPage.tsx`, `src/features/auth/StartRedirect.tsx` | `e2e/auth-redirect.spec.ts` | done |
| REQ-0151 | `src/features/content/LearnLandingPage.tsx`, `src/features/content/PublicLessonGateRedirect.tsx`, `src/app/router.tsx` | `e2e/public-lesson-login-gate.spec.ts` | done |
| REQ-0152 | `src/features/auth/StartRedirect.tsx`, `src/features/auth/homeRoute.ts`, `src/app/shell.tsx` | `e2e/auth-redirect.spec.ts` | done |
| REQ-0153 | `src/features/auth/nextRoute.ts`, `src/features/auth/LoginPage.tsx`, `src/features/auth/RegisterPage.tsx` | `src/features/auth/nextRoute.test.ts`, `e2e/public-lesson-login-gate.spec.ts` | done |
| REQ-0201 | `src/features/student/StudentLessonsPage.tsx` | `e2e/p0.spec.ts` | done |
| REQ-0202 | `src/features/student/StudentLessonsPage.tsx` | `e2e/student-lessons-filters.spec.ts` | done |
| REQ-0205 | `src/features/content/LearnLandingPage.tsx` | `e2e/learn-filters.spec.ts` | done |
| REQ-0203 | `src/features/content/LessonPlayer.tsx`, `src/features/content/PdfViewer.tsx`, `src/features/content/PptxViewer.tsx` | `src/features/content/LessonPlayer.test.tsx`, `e2e/video.spec.ts` | done |
| REQ-0204 | `src/shared/access/accessEngine.ts`, `src/features/student/StudentLessonsPage.tsx` | `src/shared/access/accessEngine.test.ts`, `e2e/enrollment-approval-flow.spec.ts` | done |
| REQ-0301 | `src/features/teacher/TeacherLessonBuilderPage.tsx` | `e2e/teacher-quiz-authoring.spec.ts` | done |
| REQ-0302 | `src/features/student/QuizRunner.tsx`, `src/features/student/quizEngine.ts` | `src/features/student/quizEngine.test.ts`, `e2e/p0.spec.ts` | done |
| REQ-0303 | `src/features/student/quizEngine.ts` | `src/features/student/quizEngine.test.ts` | done |
| REQ-0401 | `src/features/teacher/TeacherLessonBuilderPage.tsx` | `e2e/video.spec.ts` | done |
| REQ-0402 | `src/features/teacher/TeacherLessonBuilderPage.tsx`, `src/shared/offline/outbox.ts` | `e2e/p0.spec.ts`, `e2e/sync.spec.ts` | done |
| REQ-0501 | `src/features/admin/AdminTeachersPage.tsx` | `e2e/p0.spec.ts`, `e2e/admin-confirmations.spec.ts` | done |
| REQ-0502 | `src/features/admin/AdminLessonsPage.tsx` | `e2e/p0.spec.ts`, `e2e/admin-lessons-governance.spec.ts` | done |
| REQ-0503 | `src/features/student/StudentLessonsPage.tsx` | `e2e/p0.spec.ts`, `e2e/sync.spec.ts` | done |
| REQ-0504 | `src/features/admin/AdminStudentsPage.tsx` | `e2e/admin-students.spec.ts` | done |
| REQ-0505 | `src/features/admin/AdminStudentLessonPreviewPage.tsx`, `src/features/admin/AdminLessonsPage.tsx`, `src/app/router.tsx` | `e2e/admin-student-preview.spec.ts` | done |
| REQ-0506 | `src/features/admin/AdminLessonsPage.tsx` | `e2e/admin-lessons-governance.spec.ts` | done |
| REQ-0601 | `src/shared/db/progressRepo.ts`, `src/features/student/*` | `src/shared/db/progressRepo.test.ts`, `e2e/student-lesson-stepper.spec.ts` | done |
| REQ-0602 | `src/features/student/StudentProgressPage.tsx` | `e2e/reports.spec.ts` | done |
| REQ-0603 | `src/features/admin/AdminAnalyticsPage.tsx` | `e2e/admin-analytics.spec.ts` | done |
| REQ-0701 | `src/shared/access/accessEngine.ts` | `src/shared/access/accessEngine.test.ts`, `e2e/payments.spec.ts` | done |
| REQ-0702 | `src/features/student/StudentPaymentsPage.tsx` | `e2e/p0.spec.ts`, `e2e/sync-admin-coupons.spec.ts` | done |
| REQ-0703 | `src/features/student/StudentPaymentsPage.tsx` | `e2e/payments.spec.ts` | done |
| REQ-0704 | `src/shared/access/accessEngine.ts`, `src/features/teacher/TeacherLessonBuilderPage.tsx`, `src/features/admin/AdminLessonsPage.tsx` | `src/shared/access/accessEngine.test.ts`, `e2e/enrollment-approval-flow.spec.ts` | done |
| REQ-0705 | `src/shared/db/accessDefaultsRepo.ts`, `src/features/admin/AdminSettingsPage.tsx`, `src/shared/access/accessEngine.ts` | `src/shared/access/accessEngine.test.ts`, `e2e/admin-subject-access-defaults.spec.ts` | done |
| REQ-0706 | `src/shared/types.ts`, `src/features/admin/AdminCouponsPage.tsx`, `src/features/school/SchoolLicensesPage.tsx` | `e2e/enrollment-approval-flow.spec.ts` | done |
| REQ-0801 | `src/features/school/SchoolDashboard.tsx` | `e2e/school.spec.ts` | done |
| REQ-0802 | `src/features/school/SchoolUsersPage.tsx` | `e2e/school.spec.ts` | done |
| REQ-0803 | `src/features/school/SchoolLicensesPage.tsx` | `e2e/school.spec.ts` | done |
| REQ-0804 | `src/features/school/SchoolAnalyticsPage.tsx` | `e2e/school.spec.ts` | done |
| REQ-0901 | `src/features/student/StudentSupportPage.tsx`, `src/shared/messages/*` | `e2e/messaging.spec.ts` | done |
| REQ-0902 | `src/features/teacher/TeacherSupportPage.tsx`, `src/shared/messages/*` | `e2e/messaging.spec.ts` | done |
| REQ-1001 | `src/shared/db/db.ts` (Dexie versioning) | `src/shared/db/db.migrations.test.ts`, `e2e/admin-settings-backup.spec.ts` | done |
| REQ-1002 | `src/shared/ui/*`, `src/features/admin/AdminLayout.tsx` | `e2e/accessibility-basics.spec.ts`, `e2e/admin-layout.spec.ts` | done |
| REQ-1101 | `src/shared/sync/*` | `e2e/sync.spec.ts` | done |
| REQ-1102 | `src/features/sync/SyncPage.tsx` | `e2e/sync.spec.ts` | done |
| REQ-1201 | `src/features/teacher/TeacherLessonBuilderPage.tsx`, `src/features/content/LessonPlayer.tsx` | `e2e/video.spec.ts` | done |
| REQ-1301 | `src/shared/gamification/*`, `src/features/content/LearnLandingPage.tsx` | `src/shared/gamification/gamification.test.ts`, `e2e/badges.spec.ts` | done |
| REQ-1401 | `src/features/admin/AdminPaymentsPage.tsx` | `e2e/payments.spec.ts` | done |
| REQ-1601 | `src/features/student/StudentProgressPage.tsx` | `e2e/reports.spec.ts` | done |
| REQ-1701 | `src/features/notifications/NotificationsPage.tsx` | `e2e/notifications.spec.ts` | done |
| REQ-1801 | `src/shared/security/password.ts` | `src/shared/security/password.test.ts` | done |
| REQ-1802 | `src/shared/settings/*`, `src/features/school/*` | `e2e/minors.spec.ts` | done |
| REQ-1803 | `src/shared/audit/audit.ts` | `e2e/admin-students.spec.ts` | done |
| REQ-1804 | `src/features/admin/AdminAuditPage.tsx` | `e2e/admin-students.spec.ts` | done |
| REQ-1901 | `src/shared/ui/ConfirmDialog.tsx` | `e2e/admin-confirmations.spec.ts` | done |
| REQ-1902 | `src/features/admin/AdminTeachersPage.tsx`, `src/features/admin/AdminStudentsPage.tsx`, `src/features/admin/AdminSchoolAdminsPage.tsx`, `src/features/admin/AdminAdminsPage.tsx` | `e2e/admin-users-crud.spec.ts` | done |
| REQ-1903 | `src/features/admin/AdminSchoolsPage.tsx` | `e2e/admin-schools-crud.spec.ts`, `e2e/sync-admin-schools.spec.ts` | done |
| REQ-1904 | `src/features/admin/AdminLessonsPage.tsx` | `e2e/admin-lessons-governance.spec.ts` | done |
| REQ-1905 | `src/features/admin/AdminCouponsPage.tsx` | `e2e/admin-coupons-edit.spec.ts`, `e2e/sync-admin-coupons.spec.ts` | done |
| REQ-1906 | `src/features/admin/AdminPaymentsPage.tsx`, `src/features/admin/AdminLicensesPage.tsx` | `e2e/payments.spec.ts`, `e2e/admin-licenses-exports.spec.ts` | done |
| REQ-1907 | `src/features/admin/AdminSettingsPage.tsx` | `e2e/admin-settings-backup.spec.ts` | done |
| REQ-1908 | `src/features/admin/AdminSupportPage.tsx` | `e2e/admin-support.spec.ts` | done |
| REQ-1909 | `src/shared/sync/*` | `e2e/sync.spec.ts`, `e2e/sync-students.spec.ts`, `e2e/sync-admin-coupons.spec.ts`, `e2e/sync-admin-schools.spec.ts` | done |
| REQ-2001 | `src/features/teacher/TeacherLayout.tsx`, `src/features/teacher/TeacherDashboard.tsx` | `e2e/teacher-layout.spec.ts`, `e2e/teacher-dashboard.spec.ts` | done |
| REQ-2002 | `src/features/teacher/TeacherDashboard.tsx`, `src/features/teacher/lessonStatusStats.ts` | `src/features/teacher/lessonStatusStats.test.ts` | done |
| REQ-2003 | `src/features/teacher/TeacherDashboard.tsx`, `src/features/teacher/teacherDashboardMetrics.ts` | `src/features/teacher/teacherDashboardMetrics.test.ts`, `e2e/teacher-dashboard.spec.ts` | done |
| REQ-2004 | `src/features/teacher/TeacherDashboard.tsx`, `src/features/teacher/teacherDashboardMetrics.ts` | `src/features/teacher/teacherDashboardMetrics.test.ts`, `e2e/teacher-dashboard.spec.ts` | done |
| REQ-2005 | `src/features/teacher/TeacherDashboard.tsx`, `src/shared/sync/SyncContext.tsx` | `e2e/sync.spec.ts`, `e2e/teacher-dashboard.spec.ts` | done |
| REQ-2006 | `src/features/teacher/TeacherDashboard.tsx`, `src/features/teacher/teacherDashboardMetrics.ts` | `src/features/teacher/teacherDashboardMetrics.test.ts`, `e2e/teacher-dashboard.spec.ts` | done |
| REQ-2007 | `src/features/teacher/TeacherLessonsPage.tsx` | `e2e/teacher-lessons-actions.spec.ts` | done |
| REQ-2008 | `src/features/teacher/TeacherLessonBuilderPage.tsx`, `src/app/router.tsx` | `e2e/teacher-lessons-actions.spec.ts` | done |
| REQ-2010 | `src/shared/types.ts`, `src/shared/db/db.ts`, `src/shared/db/seed.ts`, `src/features/admin/AdminSettingsPage.tsx`, `src/features/teacher/TeacherLessonBuilderPage.tsx`, `src/shared/sync/*` | `e2e/admin-settings-backup.spec.ts`, `e2e/p0.spec.ts`, `e2e/sync.spec.ts`, `e2e/video.spec.ts`, `e2e/teacher-lesson-creator.spec.ts` | done |
| REQ-2011 | `src/shared/types.ts`, `src/features/teacher/TeacherLessonBuilderPage.tsx`, `src/features/content/LessonPlayer.tsx` | `e2e/teacher-text-variants.spec.ts` | done |
| REQ-2012 | `src/shared/ui/SidebarNav.tsx` | `e2e/teacher-nav-active.spec.ts` | done |
| REQ-2101 | `src/features/teacher/TeacherDashboard.tsx` | `e2e/teacher-dashboard.spec.ts`, `e2e/teacher-upload-ux.spec.ts` | done |
| REQ-2102 | `src/features/teacher/TeacherDashboard.tsx` | `e2e/teacher-dashboard.spec.ts`, `e2e/teacher-upload-ux.spec.ts` | done |
| REQ-2103 | `src/features/teacher/TeacherLessonsPage.tsx` | `e2e/teacher-lessons-actions.spec.ts`, `e2e/teacher-upload-ux.spec.ts` | done |
| REQ-2104 | `src/features/teacher/TeacherLessonsPage.tsx` | `e2e/teacher-upload-ux.spec.ts` | done |
| REQ-2105 | `src/features/teacher/TeacherLessonBuilderPage.tsx` | `e2e/teacher-lesson-creator.spec.ts`, `e2e/teacher-upload-ux.spec.ts` | done |
| REQ-2106 | `src/features/teacher/TeacherLessonBuilderPage.tsx` | `e2e/teacher-upload-ux.spec.ts` | done |
| REQ-2201 | `src/styles/tokens.css`, `tailwind.config.ts` | `src/shared/theme/ThemeProvider.test.tsx`, `e2e/theme-appearance.spec.ts` | done |
| REQ-2202 | `src/shared/theme/ThemeProvider.tsx`, `src/app/providers.tsx` | `src/shared/theme/ThemeProvider.test.tsx`, `src/features/settings/AppearanceSettingsPage.test.tsx`, `e2e/theme-appearance.spec.ts` | done |
| REQ-2203 | `src/features/settings/AppearanceSettingsPage.tsx`, `src/app/router.tsx`, `src/app/shell.tsx`, `src/features/teacher/TeacherLayout.tsx`, `src/features/admin/AdminLayout.tsx` | `src/features/settings/AppearanceSettingsPage.test.tsx`, `e2e/theme-appearance.spec.ts` | done |
| REQ-2204 | `src/**/*.tsx` (semantic token class migration), `src/styles/tokens.css` | `npm run typecheck`, `npm test`, `npm run test:e2e -- e2e/theme-appearance.spec.ts e2e/admin-layout.spec.ts` | done |
