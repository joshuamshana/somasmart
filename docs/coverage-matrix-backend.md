# Coverage Matrix (Backend)

Trace backend requirements (`BREQ-*`) to implementation and automated tests.

Status meanings:
- `done`: implemented and covered by at least one meaningful automated backend test.
- `partial`: partially implemented and/or covered, with gaps remaining.
- `planned`: not implemented yet.

| Requirement | Implementation | Tests | Status |
|---|---|---|---|
| BREQ-1001 | `apps/backend/core/services/tenantAuth.mjs` | `apps/backend/test/auth-offline-enrollment-policy.test.ts` | partial |
| BREQ-1002 | `apps/backend/core/services/tenantAuth.mjs` | `apps/backend/test/auth-offline-enrollment-policy.test.ts` | partial |
| BREQ-1003 | `apps/backend/core/services/tenantAuth.mjs`, `apps/backend/core/data/memoryStore.mjs` | `apps/backend/test/auth-offline-enrollment-policy.test.ts` | partial |
| BREQ-1004 | `apps/backend/core/services/tenantAuth.mjs`, `apps/backend/core/data/memoryStore.mjs` | `apps/backend/test/auth-offline-enrollment-policy.test.ts` | partial |
| BREQ-1005 | `apps/backend/core/services/tenantAuth.mjs`, `apps/backend/core/data/memoryStore.mjs` | `apps/backend/test/auth-offline-enrollment-policy.test.ts` | partial |
| BREQ-1006 | `apps/backend/core/services/tenantAuth.mjs` | `apps/backend/test/auth-offline-enrollment-policy.test.ts` | partial |
| BREQ-1101 | `apps/backend/core/services/tenantSync.mjs` | `apps/backend/test/sync-idempotency.test.ts` | done |
| BREQ-1102 | `apps/backend/core/services/tenantSync.mjs`, `apps/backend/core/data/memoryStore.mjs` | `apps/backend/test/sync-idempotency.test.ts` | done |
| BREQ-1103 | `apps/backend/core/services/tenantSync.mjs`, `apps/backend/core/data/memoryStore.mjs` | `apps/backend/test/sync-idempotency.test.ts` | done |
| BREQ-1104 | `apps/backend/core/services/tenantSync.mjs` | `apps/backend/test/e2e/tenant-isolation-under-platform-ops.api.spec.ts` | done |
| BREQ-1105 | `apps/backend/core/data/memoryStore.mjs`, `apps/backend/core/services/tenantSync.mjs` | `apps/backend/test/sync-tombstones-and-checkpoints.test.ts` | partial |
| BREQ-1106 | `apps/backend/core/services/tenantSync.mjs`, `apps/backend/core/data/memoryStore.mjs` | `apps/backend/test/sync-tombstones-and-checkpoints.test.ts` | partial |
| BREQ-1201 | `apps/backend/core/services/tenantSync.mjs` | `apps/backend/test/sync-tombstones-and-checkpoints.test.ts` | partial |
| BREQ-1202 | `apps/backend/core/services/tenantSync.mjs` |  | planned |
| BREQ-1203 | `apps/backend/core/services/tenantSync.mjs`, `apps/backend/core/data/memoryStore.mjs` | `apps/backend/test/blob-project-scope.test.ts` | partial |
| BREQ-1204 | `apps/backend/core/data/memoryStore.mjs`, `apps/backend/core/data/memoryStore.mjs` | `apps/backend/test/blob-project-scope.test.ts` | partial |
| BREQ-1205 | `apps/backend/core/services/tenantSync.mjs` |  | planned |
| BREQ-1301 | `apps/backend/core/data/memoryStore.mjs` | `apps/backend/test/sync-tombstones-and-checkpoints.test.ts` | partial |
| BREQ-1302 | `apps/backend/core/services/platformData.mjs`, `apps/backend/core/data/memoryStore.mjs` |  | planned |
| BREQ-1303 | `apps/backend/core/services/platformData.mjs`, `apps/backend/core/services/tenantSync.mjs` | `apps/backend/test/e2e/platform-data-mutation-audit.api.spec.ts` | partial |
| BREQ-1401 | `apps/backend/core/services/tenantSync.mjs`, `apps/backend/core/services/tenantAuth.mjs` | `apps/backend/test/e2e/tenant-isolation-under-platform-ops.api.spec.ts` | done |
| BREQ-1402 | `apps/backend/core/auth/tokens.mjs`, `apps/backend/core/services/helpers.mjs` | `apps/backend/test/e2e/platform-vs-tenant-token-boundary.api.spec.ts` | done |
| BREQ-1403 | `apps/backend/core/data/memoryStore.mjs` | `apps/backend/test/e2e/tenant-isolation-under-platform-ops.api.spec.ts` | partial |
| BREQ-1404 | `apps/backend/core/services/tenantSync.mjs`, `apps/backend/core/services/tenantAuth.mjs` | `apps/backend/test/e2e/platform-vs-tenant-token-boundary.api.spec.ts` | partial |
| BREQ-1405 | `apps/backend/core/services/tenantSync.mjs`, `apps/backend/core/data/memoryStore.mjs` | `apps/backend/test/blob-project-scope.test.ts` | partial |
| BREQ-1406 | `apps/backend/core/services/platformData.mjs`, `apps/backend/core/data/memoryStore.mjs` | `apps/backend/test/audit-project-context.test.ts` | partial |
| BREQ-1501 | `apps/backend/core/services/platformAuth.mjs`, `apps/backend/core/data/memoryStore.mjs` | `apps/backend/test/platform-auth.test.ts` | done |
| BREQ-1502 | `apps/backend/core/services/platformProjects.mjs` | `apps/backend/test/e2e/platform-project-lifecycle.api.spec.ts` | done |
| BREQ-1503 | `apps/backend/core/services/platformData.mjs`, `apps/backend/core/contracts.mjs` | `apps/backend/test/e2e/platform-data-mutation-audit.api.spec.ts` | done |
| BREQ-1504 | `apps/backend/core/services/platformData.mjs`, `apps/backend/core/contracts.mjs` | `apps/backend/test/e2e/platform-data-mutation-audit.api.spec.ts` | done |
| BREQ-1505 | `apps/backend/core/services/platformData.mjs`, `apps/backend/core/data/memoryStore.mjs` | `apps/backend/test/e2e/platform-data-mutation-audit.api.spec.ts`, `apps/backend/test/audit-project-context.test.ts` | done |
| BREQ-1506 | `apps/backend/core/services/helpers.mjs`, `apps/backend/core/services/platformAuth.mjs` | `apps/backend/test/e2e/platform-vs-tenant-token-boundary.api.spec.ts` | done |
| BREQ-1507 | `apps/backend/core/services/helpers.mjs`, `apps/backend/core/services/tenantSync.mjs`, `apps/backend/core/services/tenantAuth.mjs` | `apps/backend/test/e2e/platform-vs-tenant-token-boundary.api.spec.ts` | done |
| BREQ-1508 | `apps/backend/core/services/platformAuth.mjs`, `apps/backend/core/services/platformProjects.mjs`, `apps/backend/core/services/platformData.mjs` |  | partial |
| BREQ-1509 | `apps/backend/core/services/tenantSync.mjs`, `apps/backend/core/services/helpers.mjs` | `apps/backend/test/e2e/tenant-isolation-under-platform-ops.api.spec.ts` | done |
