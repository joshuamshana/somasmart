# E2E Matrix: Backend Sync v1.2

## Browser E2E (existing app + real backend)
- Keep existing student/teacher/admin UI journeys.
- Re-run against real backend adapter once wired.

## API E2E (platform control plane + sync boundaries)

### platform-project-lifecycle.api.spec.ts
- Login platform admin.
- Create project.
- Suspend project.
- Activate project.

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

## Additional backend verification tests
- `apps/api/test/auth-offline-enrollment-policy.test.ts`
- `apps/api/test/sync-tombstones-and-checkpoints.test.ts`
- `apps/api/test/blob-project-scope.test.ts`
- `apps/api/test/audit-project-context.test.ts`

## Exit Criteria
- API E2E suite is green.
- Tenant boundary violations return 403.
- Audit-critical operations persist trace metadata.
