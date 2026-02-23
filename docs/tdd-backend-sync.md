# TDD Plan: Backend Sync v1.2

## Strategy
1. Contract-first: define request/response validators and stable error codes.
2. Unit tests for token classes, guards, mutation validators, and core utility/data-store contracts.
3. Integration tests for idempotency, checkpoints, and audit writing.
4. API E2E for auth lifecycle, project lifecycle, reindex jobs, data mutation audit, token boundaries, and isolation.

## Test Layers

### Contract
- Validate all `/platform/*`, `/auth/*`, `/sync/*` payload schemas.
- Fail fast on missing `reasonCode` and `ticketRef` for data operations.

### Unit
- Token class guards:
  - tenant token rejected on platform routes.
  - platform token rejected on tenant routes.
- Mutation validator requires typed ops and mandatory audit envelope fields.
- Core utility coverage:
  - schema defaults and discriminated unions in `core/contracts.mjs`.
  - `httpResponse`, `errors`, `common`, `crypto`, `jwt`, and token-signing helpers.
  - bootstrap env validation and service auth helpers.

### Integration
- Project lifecycle transitions (active -> suspended -> active).
- Idempotent replay by `projectId + deviceId + batchId`.
- Event dedupe by `projectId + eventId`.
- Audit records include action, actor, projectId, reasonCode, ticketRef, traceId.

### API E2E
- `tenant-auth-lifecycle.api.spec.ts`
- `platform-project-lifecycle.api.spec.ts`
- `platform-reindex-job.api.spec.ts`
- `platform-data-mutation-audit.api.spec.ts`
- `platform-vs-tenant-token-boundary.api.spec.ts`
- `tenant-isolation-under-platform-ops.api.spec.ts`
- `backend-negative-paths.api.spec.ts`

### Additional backend tests (partial -> done promotion gate)
- `auth-offline-enrollment-policy.test.ts`
- `sync-tombstones-and-checkpoints.test.ts`
- `blob-project-scope.test.ts`
- `audit-project-context.test.ts`
- `core-modules-contracts-and-utils.test.ts`

## Merge Gate
- No BREQ item is considered complete without at least one mapped automated test.
- Any endpoint contract change requires corresponding test update.

## Next Step Plan (Knex Persistence Hardening)
1. Expand Knex migration and rollback coverage for sync/audit edge cases.
2. Keep store selection limited to `memory` and `knex` with clear env validation.
3. Improve migration + seed flow for `somasmart`, `rafikiplus`, and `platform_admin`.
4. Re-run all backend tests against database-backed runtime and close remaining `partial` BREQ items incrementally.
