# TDD Plan: Backend Sync v1.2

## Strategy
1. Contract-first: define request/response validators and stable error codes.
2. Unit tests for token classes, guards, and mutation validators.
3. Integration tests for idempotency, checkpoints, and audit writing.
4. API E2E for project lifecycle, data mutation audit, token boundaries, and isolation.

## Test Layers

### Contract
- Validate all `/platform/*`, `/auth/*`, `/sync/*` payload schemas.
- Fail fast on missing `reasonCode` and `ticketRef` for data operations.

### Unit
- Token class guards:
  - tenant token rejected on platform routes.
  - platform token rejected on tenant routes.
- Mutation validator requires typed ops and mandatory audit envelope fields.

### Integration
- Project lifecycle transitions (active -> suspended -> active).
- Idempotent replay by `projectId + deviceId + batchId`.
- Event dedupe by `projectId + eventId`.
- Audit records include action, actor, projectId, reasonCode, ticketRef, traceId.

### API E2E
- `platform-project-lifecycle.api.spec.ts`
- `platform-data-mutation-audit.api.spec.ts`
- `platform-vs-tenant-token-boundary.api.spec.ts`
- `tenant-isolation-under-platform-ops.api.spec.ts`

### Additional backend tests (partial -> done promotion gate)
- `auth-offline-enrollment-policy.test.ts`
- `sync-tombstones-and-checkpoints.test.ts`
- `blob-project-scope.test.ts`
- `audit-project-context.test.ts`

## Merge Gate
- No BREQ item is considered complete without at least one mapped automated test.
- Any endpoint contract change requires corresponding test update.

## Next Step Plan (Prisma Persistence First)
1. Implement `PrismaStore` to satisfy `DataStore` parity for projects, users, sessions, sync batches/events, checkpoints, audits, and jobs.
2. Wire store selection in app bootstrap (`MEMORY` default, `PRISMA` opt-in via env).
3. Add migrations and seed flow for `somasmart`, `rafikiplus`, and `platform_admin`.
4. Re-run all backend tests against Prisma-backed runtime and close remaining `partial` BREQ items incrementally.
