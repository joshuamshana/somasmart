# Backend Sync Requirements (BREQ)

Scope: multi-project black-box sync backend with project isolation, platform control plane, online-first auth, and offline-capable client sync.

## Status policy
- `done`: implemented and verified by automated test evidence.
- `partial`: partly implemented and/or incompletely verified.
- `planned`: not implemented yet.

## Current backend implementation scope
Current implementation includes:
- Platform control plane endpoints (`/platform/*`) with platform token class checks
- Tenant endpoint token boundaries (`/auth/*`, `/sync/*`)
- In-memory runtime data store (`MemoryStore`) with Prisma schema scaffold for persistence migration
- API-level backend E2E tests under `apps/api/test/e2e/*`

## Requirements register
| Requirement | Statement | Status |
|---|---|---|
| BREQ-1001 | Register is online-only. | partial |
| BREQ-1002 | First login on a device is online-only. | partial |
| BREQ-1003 | Offline login is allowed only after online enrollment. | partial |
| BREQ-1004 | Offline login artifacts are bound to PIN + device keystore. | partial |
| BREQ-1005 | Offline login expires after 30 days without online refresh. | partial |
| BREQ-1006 | Suspended accounts are denied on next online check. | partial |
| BREQ-1101 | `/sync/push` accepts batched device writes. | done |
| BREQ-1102 | Push is idempotent by `projectId + deviceId + batchId`. | done |
| BREQ-1103 | Event replay is deduplicated by `projectId + eventId`. | done |
| BREQ-1104 | `/sync/pull` returns only authorized deltas since checkpoint. | done |
| BREQ-1105 | Deletes propagate via tombstones. | partial |
| BREQ-1106 | Checkpoints are per-scope and per-device. | partial |
| BREQ-1201 | Pull excludes unchanged entities. | partial |
| BREQ-1202 | Pull uses projection-friendly metadata payloads. | planned |
| BREQ-1203 | Blob sync is manifest-first and lazy-bytes. | partial |
| BREQ-1204 | Blob dedupe is CID/hash based. | partial |
| BREQ-1205 | Pull supports compressed/paged transport. | planned |
| BREQ-1301 | Default conflict resolution is field-level LWW. | partial |
| BREQ-1302 | Invariant-sensitive transitions are server-guarded. | planned |
| BREQ-1303 | Rejected mutations return stable error codes. | partial |
| BREQ-1401 | Tenant isolation is mandatory across all endpoints. | done |
| BREQ-1402 | JWT tenant claims include signed `projectId` and `projectKey`. | done |
| BREQ-1403 | Tenant users are project-scoped identities. | partial |
| BREQ-1404 | Tenant admins are project-scoped only. | partial |
| BREQ-1405 | Blob access is project-scoped. | partial |
| BREQ-1406 | Audit records include `projectId` for privileged actions. | partial |
| BREQ-1501 | Platform admin identity is global (not tenant-bound). | done |
| BREQ-1502 | Platform admin can create/suspend/archive projects. | done |
| BREQ-1503 | Platform admin can execute typed cross-project data operations. | done |
| BREQ-1504 | Data operations require `reasonCode` and `ticketRef`. | done |
| BREQ-1505 | Platform operations are fully audited with trace metadata. | done |
| BREQ-1506 | Tenant identities cannot call `/platform/*` endpoints. | done |
| BREQ-1507 | Platform tokens cannot call tenant `/auth/*` or `/sync/*` routes. | done |
| BREQ-1508 | Management surface is API-only in v1. | partial |
| BREQ-1509 | Cross-project access is denied for non-platform principals. | done |

## Next implementation step
The next step is **Prisma persistence first**:
1. Implement `PrismaStore` for `DataStore` contract parity.
2. Wire store selection by environment (`MEMORY` vs `PRISMA`) in app bootstrap.
3. Add migrations + seeds for `somasmart`, `rafikiplus`, and `platform_admin`.
4. Run full backend test suite against Prisma-backed runtime.
