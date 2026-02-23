# SomaSmart API (Black-Box Sync)

This service implements a multi-project backend with:
- tenant-plane endpoints: `/auth/*`, `/sync/*`
- platform control plane: `/platform/*`

## Key guarantees
- Tenant and platform token classes are separated.
- Project-level isolation is enforced in data and sync operations.
- Platform data operations require `reasonCode` and `ticketRef` and create audit entries.

## Run
```bash
npm install
cp .env.example .env
npm run knex:migrate:latest
npm run dev
```

Backend now uses Knex + `DATABASE_URL` by default (physical DB).  
For temporary in-memory mode, set `DATA_STORE=memory`.

## Migrations (Knex)
Run migrations against whatever `DATABASE_URL` is currently set.

```bash
# Apply all pending migrations
npm run knex:migrate:latest

# Roll back the last migration batch
npm run knex:migrate:rollback
```

For a remote database URL, run:

```bash
DATABASE_URL='postgresql://user:pass@host:5432/dbname' npm run knex:migrate:latest
```

## Required bootstrap env
Backend startup requires these env vars (see `.env.example`):
- `SEED_PROJECT_KEY`
- `SEED_PROJECT_NAME`
- `SEED_TENANT_ADMIN_USERNAME`
- `SEED_TENANT_ADMIN_PASSWORD`
- `SEED_PLATFORM_ADMIN_USERNAME`
- `SEED_PLATFORM_ADMIN_PASSWORD`

Optional:
- `CORS_ORIGINS` comma-separated frontend origins allowed to call the API. Default allows common local dev ports.
- `MAX_JSON_BODY_BYTES` max JSON request payload size (default `1048576`).
- `REQUIRE_HTTPS` enforce HTTPS at the guard layer (`true` by default in production).

Production safeguards:
- `NODE_ENV=production` requires `DATA_STORE=knex` (or unset default).
- `JWT_SECRET` must be set and at least 32 characters.
- Expired sessions are rejected on `/auth/refresh` and `/platform/auth/refresh`.

On startup, the API idempotently ensures:
- one project from `SEED_PROJECT_*`
- one tenant admin in that project from `SEED_TENANT_ADMIN_*`
- one platform admin from `SEED_PLATFORM_ADMIN_*`

## Test
```bash
npm test
```

## Notable endpoints
- `POST /platform/auth/login`
- `POST /platform/projects`
- `POST /platform/projects/:projectId/data/mutations`
- `POST /auth/register`
- `POST /auth/login`
- `POST /sync/push`
- `POST /sync/pull`
