# Requirements (MVP)

This file is the requirements backlog for SomaSmart (offline-first PWA). IDs are used for test traceability.

## Milestone 0 — Bootstrap + harness
- REQ-0001 App boots (Vite/React/TS)
- REQ-0002 Offline banner reflects online/offline
- REQ-0003 Unit/component tests runnable (Vitest + RTL + MSW)
- REQ-0004 E2E tests runnable (Playwright)

## Milestone 1 — Auth + roles
- REQ-0101 Self-registration for students
- REQ-0102 Teachers cannot self-register; School Admin creates teachers (pending) and System Admin approves lifecycle
- REQ-0106 Register page supports students only (teacher registration hidden/blocked with guidance)
- REQ-0107 School Admin teacher creation syncs to System Admin (cross-device)
- REQ-0103 Login for seeded admin accounts
- REQ-0104 Role-gated routes and logout
- REQ-0105 Teacher access blocked until admin approval

## Milestone 1.5 — Public learn landing (lesson-first)
- REQ-0150 Public learn landing page at `/` (logged out and student)
- REQ-0151 Login-to-view lessons: logged-out users can browse but must sign in to open lesson content
- REQ-0152 Student stays on `/` after login; other roles redirect to their dashboards
- REQ-0153 Safe `next=` return path on login/register for students

## Milestone 2 — Student lessons + offline player
- REQ-0201 Student sees approved lessons
- REQ-0202 Filter/search lessons by level/class/subject/language
- REQ-0205 Public learn dashboard filters by level → class → subject (curriculum hierarchy) + language + search
- REQ-0203 Lesson player supports text, images, audio, PDF, PPTX (best-effort)
- REQ-0204 Locked lessons show unlock guidance

## Milestone 3 — Quizzes + tutor feedback
- REQ-0301 Teacher-authored MCQ quiz per lesson
- REQ-0302 Student self-test with instant feedback + explanations
- REQ-0303 Tutor suggests next steps (repeat/retry/suggest)

## Milestone 4 — Teacher lesson builder
- REQ-0401 Teacher builds full lesson with governed metadata (level/class/subject) + blocks + quiz
- REQ-0402 Teacher submits for approval (pending_approval)

## Milestone 5 — Admin dashboard approvals
- REQ-0501 Admin approves/suspends/deletes teachers
- REQ-0504 Admin views/suspends/deletes students
- REQ-0502 Admin reviews pending lessons and approves/rejects with feedback
- REQ-0503 Approved lessons appear in student catalog; rejected feedback visible to teacher
- REQ-0505 Admin can preview any lesson “as student” (pending + approved), including locked/unlocked simulation, without editing lesson data
- REQ-0506 Admin lesson review is read-only (except approve/reject/unpublish/version + feedback)

## Milestone 6 — Progress tracking + reports + analytics
- REQ-0601 Record lesson completion/time and quiz attempts
- REQ-0602 Student progress dashboard and CSV export
- REQ-0603 Admin analytics dashboard (users, activity, lessons, scores)

## Milestone 7 — Payments & access control
- REQ-0701 Access control via license grants (full/level/subject)
- REQ-0702 Offline coupon/voucher redemption creates license grant
- REQ-0703 Mobile money reference capture creates pending payment (no unlock in MVP)
- REQ-0704 Lesson access policy: free vs coupon (teacher sets; admin can override)
- REQ-0705 Subject default access policy via settings (`access.subjectDefault.<curriculumSubjectId>`)
- REQ-0706 Coupon/license scope supports curriculum-subject (`curriculum_subject`) in addition to legacy subject string

## Milestone 8 — School admin
- REQ-0801 School admin dashboard (school code + counts)
- REQ-0802 School admin can create student/teacher accounts for their school
- REQ-0803 School admin can grant sponsored licenses to students
- REQ-0804 School analytics (active students, completions, avg score)

## Milestone 9 — Optional messaging
- REQ-0901 Student can message teacher offline (queued locally)
- REQ-0902 Teacher can view and reply offline (queued locally)

## Milestone 10 — Hardening
- REQ-1001 IndexedDB schema migrations supported
- REQ-1002 Basic accessibility for forms/navigation

## Milestone 11 — Gap closure (sync, video, badges, payments verify, reports, notifications, security)
- REQ-1101 Periodic sync engine (push/pull + retry)
- REQ-1102 Sync status UI (manual sync + lastSync)
- REQ-1201 Lesson video blocks (teacher upload → student playback offline)
- REQ-1301 Badges + streak computation + display
- REQ-1401 Admin payment tracking + verify/reject (mobile money)
- REQ-1601 Reports export: CSV + PDF (student/admin MVP)
- REQ-1701 Notifications list + unread counts
- REQ-1801 Security: PBKDF2 salted password hashing (legacy SHA-256 upgrade)
- REQ-1802 Parental controls: minors messaging gate
- REQ-1803 Admin audit logs for key actions
- REQ-1804 Admin audit log viewer + CSV export

## Milestone 12 — Teacher Dashboard v2 (next move)
Improve teacher day-to-day workflow and visibility (no backend required; offline-first).

- REQ-2001 Teacher dashboard: consistent “dashboard-grade” layout and tokens
- REQ-2002 Teacher dashboard: lesson stats (draft/pending/approved/rejected/unpublished) + trend vs last 7 days
- REQ-2003 Teacher dashboard: “Needs attention” panel (rejected/unpublished with admin feedback)
- REQ-2004 Teacher dashboard: recent notifications (approval/rejection/system) + unread count
- REQ-2005 Teacher dashboard: sync widget (lastSync, queued, failed) + “Sync now” shortcut
- REQ-2006 Teacher dashboard: student engagement summary for teacher’s lessons (views/completions/avg score) from local progress/quizAttempts
- REQ-2007 Teacher lessons list: table view w/ search + filters + status pills + row actions (preview/edit/resubmit/delete w confirm)
- REQ-2008 Teacher lesson editing: open existing lesson in builder via `/teacher/lessons/:lessonId/edit` and resubmit (rejected/unpublished/draft)

## Milestone 13 — Curriculum hierarchy + text variants + nav hardening
- REQ-2010 Curriculum hierarchy: Level/Class/Subject admin-defined + teacher governed selection
- REQ-2011 Text blocks have variants (title/subtitle/heading/body) and render appropriately
- REQ-2012 Sidebar nav highlights only best match (no multiple active items)

## Milestone 14 — Teacher authoring UX polish (responsive + predictive)
- REQ-2101 Teacher dashboard surfaces a clear primary next action (predictive guidance) based on current lesson state
- REQ-2102 Teacher dashboard card layout remains readable on small/medium/large screens without cramped metrics
- REQ-2103 Teacher lessons page supports responsive parity: mobile card list + desktop table with consistent actions
- REQ-2104 Teacher lessons page exposes quick status filters and action-oriented hints to reduce navigation friction
- REQ-2105 Lesson creator “Blocks” step uses template-first authoring UX with clear hierarchy and reduced action clutter
- REQ-2106 Lesson creator “Blocks” step keeps gate editor visible and usable across narrow and wide breakpoints

## Milestone 19 — Full Admin Control (CRUD + confirmations)
- REQ-1901 Confirmation dialogs required for destructive actions
- REQ-1902 Admin CRUD: users (teacher/student/school_admin/admin)
- REQ-1903 Admin CRUD: schools (incl delete + roster overrides)
- REQ-1904 Admin governance: approved lessons (edit/unpublish/expire/delete)
- REQ-1905 Admin CRUD: coupons/vouchers (bulk + export + delete)
- REQ-1906 Admin payments: verify/reject confirmations + payments export; license grants extend/revoke
- REQ-1907 Admin settings: curriculum CRUD + device backup/import/reset
- REQ-1908 Admin support desk inbox + triage
- REQ-1909 Sync: student registrations + admin CRUD propagate across devices

## Milestone 22 — Theming + token centralization
- REQ-2201 Design tokens support light/dark semantic palettes
- REQ-2202 User theme preference supports `light|dark|auto` and persists
- REQ-2203 Global Appearance settings page at `/settings/appearance` for authenticated roles
- REQ-2204 App UI colors/visual semantics are centralized in design tokens (no hardcoded palette classes in UI)

## Remaining work / next move

As of **2026-02-06**, `npm test` and `npm run test:e2e` are green, and all requirements in `docs/coverage-matrix.md` are marked `done`.

Next work should be treated as enhancement scope (new requirements), not backlog recovery.
