# Data Model (IndexedDB via Dexie)

Primary tables (see `src/shared/db/db.ts`):
- `users`: Student/Teacher/Admin/School Admin with `status`
- `schools`: school profile + join code
- `lessons`: metadata and lifecycle status
- `lessonContents`: ordered content blocks for each lesson
- `lessonAssets`: blobs for image/audio/video/pdf/pptx
- `quizzes`: MCQ quiz per lesson
- `progress`: lesson completion/time/lastSeen
- `quizAttempts`: scored quiz submissions
- `payments`: payment records (coupon/voucher verified; mobile money pending)
- `licenseGrants`: grants that unlock content scopes
- `coupons`: offline coupon/voucher rules and usage tracking
- `outboxEvents`: queued sync events (pushed/pulled via mock sync server in MVP)
