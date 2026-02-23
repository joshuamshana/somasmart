# E2E Matrix: Backend Sync v1.2

## Browser E2E (existing app + real backend)
- Keep existing student/teacher/admin UI journeys.
- Re-run against real backend adapter once wired.

## API E2E (platform control plane + sync boundaries)

### tenant-auth-lifecycle.api.spec.ts
- Register and login tenant user.
- Validate `/auth/me` claims and profile payload.
- Logout revokes session and refresh is denied with `AUTH_SESSION_REVOKED`.
- Platform token is rejected on tenant auth route.

### platform-project-lifecycle.api.spec.ts
- Login platform admin.
- Create project.
- Suspend project.
- Activate project.

### platform-reindex-job.api.spec.ts
- Reject reindex call without `reasonCode` + `ticketRef`.
- Accept reindex call with audit envelope and issue `jobId`.
- Verify `/platform/jobs/:jobId` returns succeeded reindex job.

### platform-data-mutation-audit.api.spec.ts
- Reject mutation call without `reasonCode` + `ticketRef`.
- Apply typed mutation with full audit metadata.
- Verify audit entry exists.

### platform-vs-tenant-token-boundary.api.spec.ts
- Tenant token rejected on `/platform/*`.
- Platform token rejected on `/sync/*`.

### tenant-isolation-under-platform-ops.api.spec.ts
- Platform mutation in one project is visible only in that tenant's pull.
- Another project pull does not receive the mutation.

### backend-negative-paths.api.spec.ts
- Platform auth negative branches (validation/auth/session/token-class failures).
- Tenant auth negative branches (`register/login/refresh/logout/offline-enroll/me` failures).
- Platform project/data negative branches (missing project/job, duplicate key, forbidden principals).
- Sync route negative branches (`push/pull/blobs/blob` validation + auth failures).
- Runtime unknown route returns `NOT_FOUND`.

## Additional backend verification tests
- `apps/backend/test/auth-offline-enrollment-policy.test.ts`
- `apps/backend/test/sync-tombstones-and-checkpoints.test.ts`
- `apps/backend/test/blob-project-scope.test.ts`
- `apps/backend/test/audit-project-context.test.ts`
- `apps/backend/test/core-modules-contracts-and-utils.test.ts`

## Exit Criteria
- API E2E suite is green.
- Tenant boundary violations return 403.
- Audit-critical operations persist trace metadata.
