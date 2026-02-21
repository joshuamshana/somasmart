import React from "react";
import { Card } from "@/shared/ui/Card";

type EndpointSpec = {
  title: string;
  request: string;
  success: string;
  errors: string;
  notes: string;
};

function EndpointCard(spec: EndpointSpec) {
  return (
    <Card title={spec.title}>
      <div className="space-y-3 text-xs text-muted">
        <div>
          <div className="mb-1 text-sm font-semibold text-text">Request</div>
          <pre className="overflow-auto rounded-md border border-border bg-surface p-3 text-xs text-text">{spec.request}</pre>
        </div>
        <div>
          <div className="mb-1 text-sm font-semibold text-text">Success</div>
          <pre className="overflow-auto rounded-md border border-border bg-surface p-3 text-xs text-text">{spec.success}</pre>
        </div>
        <div>
          <div className="mb-1 text-sm font-semibold text-text">Errors</div>
          <pre className="overflow-auto rounded-md border border-border bg-surface p-3 text-xs text-text">{spec.errors}</pre>
        </div>
        <div>
          <div className="mb-1 text-sm font-semibold text-text">Notes</div>
          <pre className="overflow-auto rounded-md border border-border bg-surface p-3 text-xs text-text">{spec.notes}</pre>
        </div>
      </div>
    </Card>
  );
}

const endpointSpecs: EndpointSpec[] = [
  {
    title: "POST /auth/register",
    request: `URL: {baseUrl}/auth/register
Headers:
content-type: application/json

Body:
{
  "projectKey": "somasmart",
  "username": "student1",
  "password": "strong-password",
  "displayName": "Student One",
  "role": "student"
}`,
    success: `Status: 201
{
  "user": {
    "id": "usr_123",
    "projectId": "prj_123",
    "role": "student",
    "username": "student1",
    "status": "active",
    "displayName": "Student One"
  }
}`,
    errors: `Status: 400
{ "code": "VALIDATION_FAILED", "issues": [{ "path": "username", "message": "Required" }] }

Status: 404
{ "code": "PROJECT_NOT_AVAILABLE" }

Status: 409
{ "code": "USERNAME_EXISTS" }`,
    notes: `Creates a tenant user in the project identified by projectKey.
If your backend supports moderation, newly created teacher users may return status "pending".
Use this for first-time user provisioning only.`
  },
  {
    title: "POST /auth/login",
    request: `URL: {baseUrl}/auth/login
Headers:
content-type: application/json

Body:
{
  "projectKey": "somasmart",
  "username": "teacher1",
  "password": "teacher123",
  "deviceId": "web_device_default"
}`,
    success: `Status: 200
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
}`,
    errors: `Status: 400
{ "code": "VALIDATION_FAILED", "issues": [{ "path": "password", "message": "Required" }] }

Status: 401
{ "code": "AUTH_INVALID" }

Status: 403
{ "code": "AUTH_SUSPENDED" }

Status: 404
{ "code": "PROJECT_NOT_AVAILABLE" }`,
    notes: `Returns tenant-scoped access and refresh tokens.
Access token is used for /auth/me and /sync/* endpoints.
Refresh token is used only for /auth/refresh.`
  },
  {
    title: "POST /auth/refresh",
    request: `URL: {baseUrl}/auth/refresh
Headers:
content-type: application/json

Body:
{
  "refreshToken": "<tenant_refresh_token>"
}`,
    success: `Status: 200
{
  "accessToken": "<tenant_access_token>",
  "refreshToken": "<tenant_refresh_token>"
}`,
    errors: `Status: 400
{ "code": "REFRESH_TOKEN_REQUIRED" }

Status: 401
{ "code": "AUTH_INVALID" }

Status: 401
{ "code": "AUTH_SESSION_REVOKED" }

Status: 403
{ "code": "FORBIDDEN_TOKEN_CLASS" }

Status: 403
{ "code": "AUTH_NOT_ALLOWED" }`,
    notes: `Accepts only refresh token class.
Backend should rotate refresh tokens and invalidate old refresh session hashes.
Frontend retries failed protected requests after refresh.`
  },
  {
    title: "GET /auth/me",
    request: `URL: {baseUrl}/auth/me
Headers:
authorization: Bearer <tenant_access_token>`,
    success: `Status: 200
{
  "id": "usr_123",
  "projectId": "prj_123",
  "projectKey": "somasmart",
  "username": "teacher1",
  "displayName": "Teacher One",
  "role": "teacher",
  "status": "active"
}`,
    errors: `Status: 401
{ "code": "AUTH_INVALID" }

Status: 403
{ "code": "FORBIDDEN_TOKEN_CLASS" }

Status: 404
{ "code": "USER_NOT_FOUND" }`,
    notes: `Returns the authenticated tenant user profile.
Token must belong to the same tenant project context as the user.`
  },
  {
    title: "POST /sync/push",
    request: `URL: {baseUrl}/sync/push
Headers:
authorization: Bearer <tenant_access_token>
content-type: application/json

Body:
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
}`,
    success: `Status: 200
{
  "replayed": false,
  "accepted": ["evt_1_message"],
  "rejected": [],
  "serverWatermark": 42
}`,
    errors: `Status: 400
{ "code": "VALIDATION_FAILED", "issues": [{ "path": "events[0].entityType", "message": "Unsupported" }] }

Status: 403
{ "code": "FORBIDDEN_TENANT_ONLY" }`,
    notes: `Push should be idempotent on eventId (and optionally batchId) so retries do not duplicate writes.
Reject only invalid entries in rejected when partial acceptance is supported.`
  },
  {
    title: "POST /sync/pull",
    request: `URL: {baseUrl}/sync/pull
Headers:
authorization: Bearer <tenant_access_token>
content-type: application/json

Body:
{
  "deviceId": "web_device_default",
  "checkpoints": { "default": 0 }
}`,
    success: `Status: 200
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
}`,
    errors: `Status: 400
{ "code": "VALIDATION_FAILED", "issues": [{ "path": "checkpoints.default", "message": "Must be a number" }] }

Status: 403
{ "code": "FORBIDDEN_TENANT_ONLY" }`,
    notes: `Returns tenant-visible changes after supplied checkpoint(s).
Frontend persists nextCheckpoints and sends them on subsequent pull calls.`
  },
  {
    title: "POST /sync/blobs/need (optional)",
    request: `URL: {baseUrl}/sync/blobs/need
Headers:
authorization: Bearer <tenant_access_token>
content-type: application/json

Body:
{
  "cids": ["cid_1", "cid_2"]
}`,
    success: `Status: 200
{
  "missing": ["cid_2"]
}`,
    errors: `Status: 400
{ "code": "VALIDATION_FAILED", "issues": [{ "path": "cids", "message": "Array is required" }] }

Status: 403
{ "code": "FORBIDDEN_TENANT_ONLY" }`,
    notes: `Optional optimization endpoint.
Frontend asks which CIDs are missing before uploading/downloading large blob payloads.`
  },
  {
    title: "GET /sync/blob/:cid (optional)",
    request: `URL: {baseUrl}/sync/blob/:cid
Headers:
authorization: Bearer <tenant_access_token>

Path params:
cid: required content ID`,
    success: `Status: 200
Headers:
content-type: <mime>
x-blob-cid: <cid>
x-blob-size: <bytes>

Body:
<binary blob bytes>`,
    errors: `Status: 400
{ "code": "CID_REQUIRED" }

Status: 403
{ "code": "FORBIDDEN_TENANT_ONLY" }

Status: 404
{ "code": "BLOB_NOT_FOUND" }`,
    notes: `Response body must be raw binary bytes, not JSON.
Enforce tenant isolation for blob access based on authenticated token context.`
  }
];

export function BackendIntegrationPage() {
  return (
    <div className="space-y-4">
      <Card title="Backend integration guide">
        <div className="space-y-2 text-sm text-muted">
          <div>
            Configure backend URL as a full protocol URL (example: <span className="font-mono text-text">http://localhost:4000</span>).
          </div>
          <div>
            Tenant routes require <span className="font-mono text-text">Authorization: Bearer &lt;tenant_access_token&gt;</span>.
          </div>
          <div>
            Use base URL + paths exactly as documented below. Default frontend fallback base URL is <span className="font-mono text-text">http://localhost:4000</span>.
          </div>
        </div>
      </Card>

      {endpointSpecs.map((spec) => (
        <EndpointCard
          key={spec.title}
          title={spec.title}
          request={spec.request}
          success={spec.success}
          errors={spec.errors}
          notes={spec.notes}
        />
      ))}

      <Card title="Frontend outbox to sync entity mapping">
        <div className="space-y-2 text-xs text-muted">
          <div><span className="font-mono text-text">user_register, user_update, teacher_register</span>{" -> "}<span className="font-mono text-text">users</span></div>
          <div><span className="font-mono text-text">school_upsert</span>{" -> "}<span className="font-mono text-text">schools</span></div>
          <div><span className="font-mono text-text">coupon_upsert, coupons_bulk_upsert</span>{" -> "}<span className="font-mono text-text">coupons</span></div>
          <div><span className="font-mono text-text">license_grant_upsert</span>{" -> "}<span className="font-mono text-text">licenseGrants</span></div>
          <div><span className="font-mono text-text">lesson_upsert, lesson_upsert_full, lesson_submit, lesson_approved, lesson_rejected</span>{" -> "}<span className="font-mono text-text">lessons</span></div>
          <div><span className="font-mono text-text">lesson_upsert_full, lesson_submit</span>{" -> "}<span className="font-mono text-text">lessonContents, quizzes</span></div>
          <div><span className="font-mono text-text">settings_push</span>{" -> "}<span className="font-mono text-text">settings, curriculumCategories, curriculumLevels, curriculumClasses, curriculumSubjects</span></div>
          <div><span className="font-mono text-text">payment_recorded, payment_verified, payment_rejected</span>{" -> "}<span className="font-mono text-text">payments, licenseGrants</span></div>
          <div><span className="font-mono text-text">message_send</span>{" -> "}<span className="font-mono text-text">messages</span></div>
          <div><span className="font-mono text-text">progress_updated</span>{" -> "}<span className="font-mono text-text">progress, quizAttempts</span></div>
        </div>
      </Card>

      <Card title="Synced entity types">
        <div className="text-xs text-muted">
          <span className="font-mono text-text">
            users, schools, settings, curriculumCategories, curriculumLevels, curriculumClasses, curriculumSubjects,
            lessons, lessonContents, quizzes, progress, quizAttempts, payments, licenseGrants, coupons, messages,
            notifications, auditLogs
          </span>
        </div>
      </Card>

      <Card title="Error code glossary">
        <div className="space-y-1 text-xs text-muted">
          <div><span className="font-mono text-text">VALIDATION_FAILED</span>: request payload is invalid.</div>
          <div><span className="font-mono text-text">PROJECT_NOT_AVAILABLE</span>: project key missing, inactive, or unavailable.</div>
          <div><span className="font-mono text-text">AUTH_INVALID</span>: token or credentials are invalid.</div>
          <div><span className="font-mono text-text">AUTH_SUSPENDED</span>: tenant user is suspended.</div>
          <div><span className="font-mono text-text">REFRESH_TOKEN_REQUIRED</span>: refresh payload missing required token.</div>
          <div><span className="font-mono text-text">AUTH_SESSION_REVOKED</span>: refresh session is revoked or rotated out.</div>
          <div><span className="font-mono text-text">AUTH_NOT_ALLOWED</span>: user is not allowed to authenticate for this project context.</div>
          <div><span className="font-mono text-text">FORBIDDEN_TOKEN_CLASS</span>: wrong token class for endpoint.</div>
          <div><span className="font-mono text-text">FORBIDDEN_TENANT_ONLY</span>: endpoint accepts tenant-scoped auth only.</div>
          <div><span className="font-mono text-text">CID_REQUIRED</span>: missing blob content ID in request path.</div>
          <div><span className="font-mono text-text">BLOB_NOT_FOUND</span>: blob content ID not found in project scope.</div>
        </div>
      </Card>

      <Card title="Integration checklist">
        <div className="space-y-1 text-xs text-muted">
          <div>1. Configure frontend backend URL as full protocol URL, e.g. <span className="font-mono text-text">http://localhost:4000</span>.</div>
          <div>2. Ensure CORS is enabled for the frontend origin, or expose backend behind same-origin reverse proxy.</div>
          <div>3. Ensure project key exists and is active in your tenant/project store.</div>
          <div>4. Implement refresh token rotation and revocation handling.</div>
          <div>5. Keep error response shapes stable using the documented <span className="font-mono text-text">code</span> values.</div>
        </div>
      </Card>
    </div>
  );
}
