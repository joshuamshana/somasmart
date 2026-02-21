# Frontend Backend Integration Guide

This guide defines the REST API contract a backend must provide for SomaSmart frontend/dashboard sync and tenant auth.

## 1. Base URL policy

- Frontend backend URL must be an absolute URL with protocol: `http://...` or `https://...`
- Example: `http://localhost:4000`
- Default frontend fallback URL: `http://localhost:4000`

## 2. Authorization policy

- Protected tenant routes require header:
  - `Authorization: Bearer <tenant_access_token>`
- Token classes must be enforced:
  - Tenant-only routes must reject non-tenant token classes.
- Project scope must be enforced:
  - Tokens and user/session data must stay within tenant project boundaries.

## 3. Endpoint contract

Use `{baseUrl}` to represent your configured backend URL.

### POST {baseUrl}/auth/register

#### Request

Headers:

- `content-type: application/json`

Body:

```json
{
  "projectKey": "somasmart",
  "username": "student1",
  "password": "strong-password",
  "displayName": "Student One",
  "role": "student"
}
```

#### Success

Status: `201`

```json
{
  "user": {
    "id": "usr_123",
    "projectId": "prj_123",
    "role": "student",
    "username": "student1",
    "status": "active",
    "displayName": "Student One"
  }
}
```

#### Errors

- `400`

```json
{ "code": "VALIDATION_FAILED", "issues": [{ "path": "username", "message": "Required" }] }
```

- `404`

```json
{ "code": "PROJECT_NOT_AVAILABLE" }
```

- `409`

```json
{ "code": "USERNAME_EXISTS" }
```

#### Notes

- Creates a tenant user under `projectKey`.
- If your lifecycle includes teacher approval, teacher users may be created with `status: "pending"`.

### POST {baseUrl}/auth/login

#### Request

Headers:

- `content-type: application/json`

Body:

```json
{
  "projectKey": "somasmart",
  "username": "teacher1",
  "password": "teacher123",
  "deviceId": "web_device_default"
}
```

#### Success

Status: `200`

```json
{
  "accessToken": "<tenant_access_token>",
  "refreshToken": "<tenant_refresh_token>",
  "user": {
    "id": "usr_123",
    "username": "teacher1",
    "role": "teacher",
    "projectId": "prj_123",
    "projectKey": "somasmart"
  },
  "offlineEnrollment": {
    "ticket": "<offline_ticket>",
    "expiresAt": "2026-03-21T00:00:00.000Z",
    "mode": "pin_keystore"
  }
}
```

#### Errors

- `400`: `{ "code": "VALIDATION_FAILED", "issues": [...] }`
- `401`: `{ "code": "AUTH_INVALID" }`
- `403`: `{ "code": "AUTH_SUSPENDED" }`
- `404`: `{ "code": "PROJECT_NOT_AVAILABLE" }`

#### Notes

- Returns tenant-scoped access + refresh tokens.
- Access token is used for protected tenant routes.

### POST {baseUrl}/auth/refresh

#### Request

Headers:

- `content-type: application/json`

Body:

```json
{
  "refreshToken": "<tenant_refresh_token>"
}
```

#### Success

Status: `200`

```json
{
  "accessToken": "<tenant_access_token>",
  "refreshToken": "<tenant_refresh_token>"
}
```

#### Errors

- `400`: `{ "code": "REFRESH_TOKEN_REQUIRED" }`
- `401`: `{ "code": "AUTH_INVALID" }`
- `401`: `{ "code": "AUTH_SESSION_REVOKED" }`
- `403`: `{ "code": "FORBIDDEN_TOKEN_CLASS" }`
- `403`: `{ "code": "AUTH_NOT_ALLOWED" }`

#### Notes

- Accepts refresh token only.
- Backend should rotate refresh tokens and revoke stale refresh sessions.

### GET {baseUrl}/auth/me

#### Request

Headers:

- `authorization: Bearer <tenant_access_token>`

#### Success

Status: `200`

```json
{
  "id": "usr_123",
  "projectId": "prj_123",
  "projectKey": "somasmart",
  "username": "teacher1",
  "displayName": "Teacher One",
  "role": "teacher",
  "status": "active"
}
```

#### Errors

- `401`: `{ "code": "AUTH_INVALID" }`
- `403`: `{ "code": "FORBIDDEN_TOKEN_CLASS" }`
- `404`: `{ "code": "USER_NOT_FOUND" }`

#### Notes

- Used by frontend to hydrate current user profile after auth.

### POST {baseUrl}/sync/push

#### Request

Headers:

- `authorization: Bearer <tenant_access_token>`
- `content-type: application/json`

Body:

```json
{
  "deviceId": "web_device_default",
  "batchId": "batch_1739971200000",
  "events": [
    {
      "eventId": "evt_1_message",
      "entityType": "messages",
      "entityId": "msg_123",
      "op": "upsert",
      "data": { "id": "msg_123", "status": "sent" },
      "occurredAt": "2026-02-19T00:00:00.000Z"
    }
  ]
}
```

#### Success

Status: `200`

```json
{
  "replayed": false,
  "accepted": ["evt_1_message"],
  "rejected": [],
  "serverWatermark": 42
}
```

#### Errors

- `400`: `{ "code": "VALIDATION_FAILED", "issues": [...] }`
- `403`: `{ "code": "FORBIDDEN_TENANT_ONLY" }`

#### Notes

- Push should be idempotent by `eventId` (and optionally `batchId`) to support retries.
- Backend may partially reject invalid events while accepting valid events in same request.

### POST {baseUrl}/sync/pull

#### Request

Headers:

- `authorization: Bearer <tenant_access_token>`
- `content-type: application/json`

Body:

```json
{
  "deviceId": "web_device_default",
  "checkpoints": { "default": 0 }
}
```

#### Success

Status: `200`

```json
{
  "scope": "default",
  "changes": [
    {
      "id": "chg_1",
      "seq": 43,
      "entityType": "users",
      "entityId": "usr_123",
      "op": "upsert",
      "data": {},
      "occurredAt": "2026-02-19T00:00:00.000Z"
    }
  ],
  "nextCheckpoints": { "default": 43 }
}
```

#### Errors

- `400`: `{ "code": "VALIDATION_FAILED", "issues": [...] }`
- `403`: `{ "code": "FORBIDDEN_TENANT_ONLY" }`

#### Notes

- Returns deltas after given checkpoint(s).
- Frontend persists `nextCheckpoints` and sends them on next pull.

### POST {baseUrl}/sync/blobs/need (optional)

#### Request

Headers:

- `authorization: Bearer <tenant_access_token>`
- `content-type: application/json`

Body:

```json
{
  "cids": ["cid_1", "cid_2"]
}
```

#### Success

Status: `200`

```json
{
  "missing": ["cid_2"]
}
```

#### Errors

- `400`: `{ "code": "VALIDATION_FAILED", "issues": [...] }`
- `403`: `{ "code": "FORBIDDEN_TENANT_ONLY" }`

#### Notes

- Optional optimization for blob sync.
- Backend returns which CIDs are not present yet.

### GET {baseUrl}/sync/blob/:cid (optional)

#### Request

Headers:

- `authorization: Bearer <tenant_access_token>`

Path param:

- `cid` (required)

#### Success

Status: `200`

Headers:

- `content-type: <mime>`
- `x-blob-cid: <cid>`
- `x-blob-size: <bytes>`

Body:

- Binary blob bytes (not JSON)

#### Errors

- `400`: `{ "code": "CID_REQUIRED" }`
- `403`: `{ "code": "FORBIDDEN_TENANT_ONLY" }`
- `404`: `{ "code": "BLOB_NOT_FOUND" }`

#### Notes

- Must return raw bytes.
- Blob lookup must remain tenant scoped.

## 4. Frontend action mapping to `entityType`

| Frontend action/outbox type | Sync `entityType` |
|---|---|
| `user_register`, `user_update`, `teacher_register` | `users` |
| `school_upsert` | `schools` |
| `coupon_upsert`, `coupons_bulk_upsert` | `coupons` |
| `license_grant_upsert` | `licenseGrants` |
| `lesson_upsert`, `lesson_upsert_full`, `lesson_submit`, `lesson_approved`, `lesson_rejected` | `lessons` |
| `lesson_upsert_full`, `lesson_submit` | `lessonContents`, `quizzes` |
| `settings_push` | `settings`, `curriculumCategories`, `curriculumLevels`, `curriculumClasses`, `curriculumSubjects` |
| `payment_recorded`, `payment_verified`, `payment_rejected` | `payments`, `licenseGrants` |
| `message_send` | `messages` |
| `progress_updated` | `progress`, `quizAttempts` |

## 5. Entity types frontend consumes from pull

- `users`
- `schools`
- `settings`
- `curriculumCategories`
- `curriculumLevels`
- `curriculumClasses`
- `curriculumSubjects`
- `lessons`
- `lessonContents`
- `quizzes`
- `progress`
- `quizAttempts`
- `payments`
- `licenseGrants`
- `coupons`
- `messages`
- `notifications`
- `auditLogs`

## 6. Error code glossary

- `VALIDATION_FAILED`: request payload does not match schema.
- `PROJECT_NOT_AVAILABLE`: project key is missing, invalid, or inactive.
- `AUTH_INVALID`: credentials/token invalid or expired.
- `AUTH_SUSPENDED`: tenant user is suspended.
- `REFRESH_TOKEN_REQUIRED`: refresh request missing token.
- `AUTH_SESSION_REVOKED`: refresh session revoked/rotated out.
- `AUTH_NOT_ALLOWED`: user not allowed to authenticate for this project context.
- `FORBIDDEN_TOKEN_CLASS`: wrong token class for endpoint.
- `FORBIDDEN_TENANT_ONLY`: endpoint accepts tenant auth only.
- `CID_REQUIRED`: blob endpoint missing required CID.
- `BLOB_NOT_FOUND`: blob CID not found in tenant scope.

## 7. Integration checklist

1. Configure frontend backend URL as full protocol URL, for example `http://localhost:4000`.
2. Ensure same-origin reverse proxy or CORS for your frontend origin.
3. Ensure `projectKey` is active and tenant users belong to it.
4. Implement refresh token rotation and session revocation.
5. Keep error payload shape stable, especially `{ "code": "..." }`.
