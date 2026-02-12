# Coverage Matrix (Backend)

Trace backend requirements (`BREQ-*`) to implementation and automated tests.

Status meanings:
- `done`: implemented and covered by at least one meaningful automated backend test.
- `partial`: partially implemented and/or covered, with gaps remaining.
- `planned`: not implemented yet.

| Requirement | Implementation | Tests | Status |
|---|---|---|---|
| BREQ-1001 | `apps/api/src/routes/tenantAuth.ts` | `apps/api/test/auth-offline-enrollment-policy.test.ts` | partial |
| BREQ-1002 | `apps/api/src/routes/tenantAuth.ts` | `apps/api/test/auth-offline-enrollment-policy.test.ts` | partial |
| BREQ-1003 | `apps/api/src/routes/tenantAuth.ts`, `apps/api/src/data/memoryStore.ts` | `apps/api/test/auth-offline-enrollment-policy.test.ts` | partial |
| BREQ-1004 | `apps/api/src/routes/tenantAuth.ts`, `apps/api/src/data/memoryStore.ts` | `apps/api/test/auth-offline-enrollment-policy.test.ts` | partial |
| BREQ-1005 | `apps/api/src/routes/tenantAuth.ts`, `apps/api/src/data/memoryStore.ts` | `apps/api/test/auth-offline-enrollment-policy.test.ts` | partial |
| BREQ-1006 | `apps/api/src/routes/tenantAuth.ts` | `apps/api/test/auth-offline-enrollment-policy.test.ts` | partial |
| BREQ-1101 | `apps/api/src/routes/tenantSync.ts` | `apps/api/test/sync-idempotency.test.ts` | done |
| BREQ-1102 | `apps/api/src/routes/tenantSync.ts`, `apps/api/src/data/memoryStore.ts` | `apps/api/test/sync-idempotency.test.ts` | done |
| BREQ-1103 | `apps/api/src/routes/tenantSync.ts`, `apps/api/src/data/memoryStore.ts` | `apps/api/test/sync-idempotency.test.ts` | done |
| BREQ-1104 | `apps/api/src/routes/tenantSync.ts` | `apps/api/test/e2e/tenant-isolation-under-platform-ops.api.spec.ts` | done |
| BREQ-1105 | `apps/api/src/data/memoryStore.ts`, `apps/api/src/routes/tenantSync.ts` | `apps/api/test/sync-tombstones-and-checkpoints.test.ts` | partial |
| BREQ-1106 | `apps/api/src/routes/tenantSync.ts`, `apps/api/src/data/memoryStore.ts` | `apps/api/test/sync-tombstones-and-checkpoints.test.ts` | partial |
| BREQ-1201 | `apps/api/src/routes/tenantSync.ts` | `apps/api/test/sync-tombstones-and-checkpoints.test.ts` | partial |
| BREQ-1202 | `apps/api/src/routes/tenantSync.ts` |  | planned |
| BREQ-1203 | `apps/api/src/routes/tenantSync.ts`, `apps/api/src/data/memoryStore.ts` | `apps/api/test/blob-project-scope.test.ts` | partial |
| BREQ-1204 | `apps/api/src/data/memoryStore.ts`, `apps/api/src/data/heliaBlobStore.ts` | `apps/api/test/blob-project-scope.test.ts` | partial |
| BREQ-1205 | `apps/api/src/routes/tenantSync.ts` |  | planned |
| BREQ-1301 | `apps/api/src/data/memoryStore.ts` | `apps/api/test/sync-tombstones-and-checkpoints.test.ts` | partial |
| BREQ-1302 | `apps/api/src/routes/platformData.ts`, `apps/api/src/data/memoryStore.ts` |  | planned |
| BREQ-1303 | `apps/api/src/routes/platformData.ts`, `apps/api/src/routes/tenantSync.ts` | `apps/api/test/e2e/platform-data-mutation-audit.api.spec.ts` | partial |
| BREQ-1401 | `apps/api/src/routes/tenantSync.ts`, `apps/api/src/routes/tenantAuth.ts` | `apps/api/test/e2e/tenant-isolation-under-platform-ops.api.spec.ts` | done |
| BREQ-1402 | `apps/api/src/auth/tokens.ts`, `apps/api/src/routes/helpers.ts` | `apps/api/test/e2e/platform-vs-tenant-token-boundary.api.spec.ts` | done |
| BREQ-1403 | `apps/api/src/data/memoryStore.ts` | `apps/api/test/e2e/tenant-isolation-under-platform-ops.api.spec.ts` | partial |
| BREQ-1404 | `apps/api/src/routes/tenantSync.ts`, `apps/api/src/routes/tenantAuth.ts` | `apps/api/test/e2e/platform-vs-tenant-token-boundary.api.spec.ts` | partial |
| BREQ-1405 | `apps/api/src/routes/tenantSync.ts`, `apps/api/src/data/memoryStore.ts` | `apps/api/test/blob-project-scope.test.ts` | partial |
| BREQ-1406 | `apps/api/src/routes/platformData.ts`, `apps/api/src/data/memoryStore.ts` | `apps/api/test/audit-project-context.test.ts` | partial |
| BREQ-1501 | `apps/api/src/routes/platformAuth.ts`, `apps/api/src/data/memoryStore.ts` | `apps/api/test/platform-auth.test.ts` | done |
| BREQ-1502 | `apps/api/src/routes/platformProjects.ts` | `apps/api/test/e2e/platform-project-lifecycle.api.spec.ts` | done |
| BREQ-1503 | `apps/api/src/routes/platformData.ts`, `apps/api/src/contracts.ts` | `apps/api/test/e2e/platform-data-mutation-audit.api.spec.ts` | done |
| BREQ-1504 | `apps/api/src/routes/platformData.ts`, `apps/api/src/contracts.ts` | `apps/api/test/e2e/platform-data-mutation-audit.api.spec.ts` | done |
| BREQ-1505 | `apps/api/src/routes/platformData.ts`, `apps/api/src/data/memoryStore.ts` | `apps/api/test/e2e/platform-data-mutation-audit.api.spec.ts`, `apps/api/test/audit-project-context.test.ts` | done |
| BREQ-1506 | `apps/api/src/routes/helpers.ts`, `apps/api/src/routes/platformAuth.ts` | `apps/api/test/e2e/platform-vs-tenant-token-boundary.api.spec.ts` | done |
| BREQ-1507 | `apps/api/src/routes/helpers.ts`, `apps/api/src/routes/tenantSync.ts`, `apps/api/src/routes/tenantAuth.ts` | `apps/api/test/e2e/platform-vs-tenant-token-boundary.api.spec.ts` | done |
| BREQ-1508 | `apps/api/src/routes/platformAuth.ts`, `apps/api/src/routes/platformProjects.ts`, `apps/api/src/routes/platformData.ts` |  | partial |
| BREQ-1509 | `apps/api/src/routes/tenantSync.ts`, `apps/api/src/routes/helpers.ts` | `apps/api/test/e2e/tenant-isolation-under-platform-ops.api.spec.ts` | done |
