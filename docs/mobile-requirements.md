# Mobile Requirements (Student App)

## App identity
- App: SomaSmart Student Mobile
- Android package id: `com.fahamutech.somasmart`
- Workspace path: `/Users/joshuamshana/Documents/SomaSmart/apps/student_mobile`

## Scope
- Student-only mobile experience.
- API-first with offline SQLite cache and outbox sync.
- Android-first release target.

## Functional coverage
- Student auth (login/register/logout).
- Learn landing/dashboard with key student metrics.
- Lessons list with search and curriculum filters.
- Lesson player with stepper and quiz gate.
- Progress tracking with CSV/PDF export.
- Payments (coupon/voucher redeem, mobile-money pending capture).
- Support messaging (offline queued send).
- Notifications (list + mark read).
- Sync page (manual sync, status, queued/failed counts).
- Appearance settings (light/dark/auto).

## Sync contracts
- `/auth/register`
- `/auth/login`
- `/auth/refresh`
- `/sync/push`
- `/sync/pull`
- `/sync/blobs/need`
- `/sync/blob/:cid`

## Offline behavior
- Local cache via Drift/SQLite.
- User actions captured into outbox and pushed on sync.
- Pull reconciliation updates local entity store.

## Non-goals
- Teacher/admin/school-admin UI parity in this app.
- Full iOS/web targets in this milestone.
