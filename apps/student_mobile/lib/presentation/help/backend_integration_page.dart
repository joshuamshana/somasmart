import 'package:flutter/material.dart';

class _EndpointSpec {
  const _EndpointSpec({
    required this.title,
    required this.request,
    required this.success,
    required this.errors,
    required this.notes,
  });

  final String title;
  final String request;
  final String success;
  final String errors;
  final String notes;
}

class _EndpointCard extends StatelessWidget {
  const _EndpointCard({required this.spec});

  final _EndpointSpec spec;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              spec.title,
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 10),
            _block('Request', spec.request),
            const SizedBox(height: 8),
            _block('Success', spec.success),
            const SizedBox(height: 8),
            _block('Errors', spec.errors),
            const SizedBox(height: 8),
            _block('Notes', spec.notes),
          ],
        ),
      ),
    );
  }

  Widget _block(String title, String body) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
        const SizedBox(height: 4),
        Container(
          width: double.infinity,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.black12),
            color: const Color(0xFFF7F7F7),
          ),
          padding: const EdgeInsets.all(10),
          child: SelectableText(
            body,
            style: const TextStyle(
              fontFamily: 'monospace',
              fontSize: 12,
              height: 1.35,
            ),
          ),
        ),
      ],
    );
  }
}

const List<_EndpointSpec> _endpointSpecs = [
  _EndpointSpec(
    title: 'POST /auth/register',
    request: '''
URL: {baseUrl}/auth/register
Headers:
content-type: application/json

Body:
{
  "projectKey": "somasmart",
  "username": "student1",
  "password": "strong-password",
  "displayName": "Student One",
  "role": "student"
}''',
    success: '''
Status: 201
{
  "user": {
    "id": "usr_123",
    "projectId": "prj_123",
    "role": "student",
    "username": "student1",
    "status": "active",
    "displayName": "Student One"
  }
}''',
    errors: '''
Status: 400
{ "code": "VALIDATION_FAILED", "issues": [{ "path": "username", "message": "Required" }] }

Status: 404
{ "code": "PROJECT_NOT_AVAILABLE" }

Status: 409
{ "code": "USERNAME_EXISTS" }''',
    notes: '''
Creates a tenant user under the provided projectKey.
Use for first-time user provisioning only.''',
  ),
  _EndpointSpec(
    title: 'POST /auth/login',
    request: '''
URL: {baseUrl}/auth/login
Headers:
content-type: application/json

Body:
{
  "projectKey": "somasmart",
  "username": "teacher1",
  "password": "teacher123",
  "deviceId": "android_student_mobile"
}''',
    success: '''
Status: 200
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
}''',
    errors: '''
Status: 400
{ "code": "VALIDATION_FAILED", "issues": [{ "path": "password", "message": "Required" }] }

Status: 401
{ "code": "AUTH_INVALID" }

Status: 403
{ "code": "AUTH_SUSPENDED" }

Status: 404
{ "code": "PROJECT_NOT_AVAILABLE" }''',
    notes: '''
Returns tenant-scoped access and refresh tokens.
Access token is used for /auth/me and /sync/*.''',
  ),
  _EndpointSpec(
    title: 'POST /auth/refresh',
    request: '''
URL: {baseUrl}/auth/refresh
Headers:
content-type: application/json

Body:
{
  "refreshToken": "<tenant_refresh_token>"
}''',
    success: '''
Status: 200
{
  "accessToken": "<tenant_access_token>",
  "refreshToken": "<tenant_refresh_token>"
}''',
    errors: '''
Status: 400
{ "code": "REFRESH_TOKEN_REQUIRED" }

Status: 401
{ "code": "AUTH_INVALID" }

Status: 401
{ "code": "AUTH_SESSION_REVOKED" }

Status: 403
{ "code": "FORBIDDEN_TOKEN_CLASS" }

Status: 403
{ "code": "AUTH_NOT_ALLOWED" }''',
    notes: '''
Accepts refresh token only.
Backend should rotate refresh tokens and revoke stale sessions.''',
  ),
  _EndpointSpec(
    title: 'GET /auth/me',
    request: '''
URL: {baseUrl}/auth/me
Headers:
authorization: Bearer <tenant_access_token>''',
    success: '''
Status: 200
{
  "id": "usr_123",
  "projectId": "prj_123",
  "projectKey": "somasmart",
  "username": "teacher1",
  "displayName": "Teacher One",
  "role": "teacher",
  "status": "active"
}''',
    errors: '''
Status: 401
{ "code": "AUTH_INVALID" }

Status: 403
{ "code": "FORBIDDEN_TOKEN_CLASS" }

Status: 404
{ "code": "USER_NOT_FOUND" }''',
    notes: '''
Returns authenticated tenant profile.
Token must be tenant-scoped.''',
  ),
  _EndpointSpec(
    title: 'POST /sync/push',
    request: '''
URL: {baseUrl}/sync/push
Headers:
authorization: Bearer <tenant_access_token>
content-type: application/json

Body:
{
  "projectKey": "somasmart",
  "deviceId": "android_student_mobile",
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
}''',
    success: '''
Status: 200
{
  "replayed": false,
  "accepted": ["evt_1_message"],
  "rejected": [],
  "serverWatermark": 42
}''',
    errors: '''
Status: 400
{ "code": "VALIDATION_FAILED", "issues": [{ "path": "events[0].entityType", "message": "Unsupported" }] }

Status: 403
{ "code": "FORBIDDEN_TENANT_ONLY" }''',
    notes: '''
Push should be idempotent on eventId (and optionally batchId).
Partial acceptance is allowed when backend supports per-event rejection.''',
  ),
  _EndpointSpec(
    title: 'POST /sync/pull',
    request: '''
URL: {baseUrl}/sync/pull
Headers:
authorization: Bearer <tenant_access_token>
content-type: application/json

Body:
{
  "deviceId": "android_student_mobile",
  "checkpoints": { "default": 0 }
}''',
    success: '''
Status: 200
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
}''',
    errors: '''
Status: 400
{ "code": "VALIDATION_FAILED", "issues": [{ "path": "checkpoints.default", "message": "Must be a number" }] }

Status: 403
{ "code": "FORBIDDEN_TENANT_ONLY" }''',
    notes: '''
Returns deltas after provided checkpoint(s).
Frontend persists nextCheckpoints and sends them on next pull.''',
  ),
  _EndpointSpec(
    title: 'POST /sync/blobs/need (optional)',
    request: '''
URL: {baseUrl}/sync/blobs/need
Headers:
authorization: Bearer <tenant_access_token>
content-type: application/json

Body:
{
  "cids": ["cid_1", "cid_2"]
}''',
    success: '''
Status: 200
{
  "missing": ["cid_2"]
}''',
    errors: '''
Status: 400
{ "code": "VALIDATION_FAILED", "issues": [{ "path": "cids", "message": "Array is required" }] }

Status: 403
{ "code": "FORBIDDEN_TENANT_ONLY" }''',
    notes: '''
Optional optimization endpoint.
Returns CIDs missing on backend for blob sync flow.''',
  ),
  _EndpointSpec(
    title: 'GET /sync/blob/:cid (optional)',
    request: '''
URL: {baseUrl}/sync/blob/:cid
Headers:
authorization: Bearer <tenant_access_token>

Path params:
cid: required content ID''',
    success: '''
Status: 200
Headers:
content-type: <mime>
x-blob-cid: <cid>
x-blob-size: <bytes>

Body:
<binary blob bytes>''',
    errors: '''
Status: 400
{ "code": "CID_REQUIRED" }

Status: 403
{ "code": "FORBIDDEN_TENANT_ONLY" }

Status: 404
{ "code": "BLOB_NOT_FOUND" }''',
    notes: '''
Response body must be raw bytes (not JSON).
Blob lookup must remain tenant-scoped.''',
  ),
];

class BackendIntegrationPage extends StatelessWidget {
  const BackendIntegrationPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Backend integration guide')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Card(
            child: Padding(
              padding: EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'REST API Contract',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                  ),
                  SizedBox(height: 8),
                  Text(
                    'Base URL must be absolute with protocol, e.g. http://10.0.2.2:4000.',
                  ),
                  Text(
                    'Tenant routes require Authorization: Bearer <tenant_access_token>.',
                  ),
                  Text(
                    'Use the same endpoint paths and payload shape shown below.',
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 10),
          ..._endpointSpecs.map(
            (spec) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: _EndpointCard(spec: spec),
            ),
          ),
          const Card(
            child: Padding(
              padding: EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Entity types consumed by frontend',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                  SizedBox(height: 6),
                  SelectableText(
                    'users, schools, settings, curriculumCategories, curriculumLevels, curriculumClasses, '
                    'curriculumSubjects, lessons, lessonContents, quizzes, progress, quizAttempts, '
                    'payments, licenseGrants, coupons, messages, notifications, auditLogs',
                    style: TextStyle(fontFamily: 'monospace', fontSize: 12),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 10),
          const Card(
            child: Padding(
              padding: EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Error code glossary',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                  SizedBox(height: 6),
                  Text(
                    'VALIDATION_FAILED, PROJECT_NOT_AVAILABLE, AUTH_INVALID, AUTH_SUSPENDED,',
                  ),
                  Text(
                    'REFRESH_TOKEN_REQUIRED, AUTH_SESSION_REVOKED, AUTH_NOT_ALLOWED,',
                  ),
                  Text(
                    'FORBIDDEN_TOKEN_CLASS, FORBIDDEN_TENANT_ONLY, CID_REQUIRED, BLOB_NOT_FOUND',
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
