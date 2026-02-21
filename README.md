# SomaSmart (Offline-First PWA AI Tutor)

This repository contains the SomaSmart MVP implemented as an offline-first **React + Vite + TypeScript** PWA with local IndexedDB storage and mocked “sync”.

## Prerequisites
- Node.js (tested with Node 24)
- Internet access to install dependencies (this environment may be offline)

## Install
Using pnpm (recommended):
- `pnpm install`
- `pnpm dev`

Using npm:
- `npm install`
- `npm run dev`

## Accounts
- No frontend demo users are pre-seeded.
- Backend bootstrap admin credentials are defined via `apps/backend/.env` `SEED_*` vars.
- Students can self-register. Teachers self-register as **pending** until approved by admin.

## Tests
- Unit/component: `npm test`
- Unit/component coverage (100% gated scope): `npm run test:coverage:ci`
- Journey + requirements matrix validation: `npm run test:journeys:matrix`
- E2E: `npm run test:e2e`
- E2E backend-call interception for sync API mode: `npm run test:e2e:sync-api`
- Full CI order locally: `npm run ci`

## Docs
- `docs/requirements.md`
- `docs/coverage-matrix.md`
- `docs/data-model.md`
- `docs/p0-journeys.md`
- `docs/requirements-backend-sync.md`
- `docs/coverage-matrix-backend.md`
- `docs/tdd-backend-sync.md`
- `docs/e2e-backend-sync.md`
- `docs/frontend-backend-integration.md`

## Backend API (Multi-Project Black-Box Sync)
A backend workspace now exists at `/Users/joshuamshana/Documents/SomaSmart/apps/backend`.

### Backend install
- `cd /Users/joshuamshana/Documents/SomaSmart/apps/backend`
- `npm install`

### Backend run
- `npm run dev`

### Frontend -> Backend sync mode
Frontend now defaults to live backend sync (`api` mode) in normal app runs.
Mock mode remains available and is used by default in test commands.

To run live sync against backend (`/sync/*`):

1. Start the backend (`apps/backend`) on port `4000`.
2. Optional env vars in `.env.local`:
   - `VITE_SYNC_MODE=api` (only needed if you want to force it explicitly)
   - `VITE_SYNC_API_URL=http://localhost:4000` (default is `http://localhost:4000`; must include protocol)
   - `VITE_SYNC_PROJECT_KEY=somasmart` (optional; defaults to `somasmart`)
   - `VITE_SYNC_DEVICE_ID=web_device_default` (optional)
3. Restart `npm run dev` for the frontend.

You can also configure endpoint and project key at runtime per device:
- Public left menu -> `Connection settings` (`/connection-settings`)
- Admin -> `Settings` -> `Backend sync connection`
- Read-only summary on `Sync` page
- Backend URL must be a full URL with protocol, e.g. `http://localhost:4000`

In API mode, sync auth now supports both approaches:
- Static token mode: set `VITE_SYNC_ACCESS_TOKEN=<tenant_access_token>`.
- Runtime auth mode (no static token needed):
  - The frontend captures login/register credentials and auto logins to backend tenant auth.
  - If backend tenant user is missing, frontend auto-registers it and retries login.
  - Optional fixed sync credentials can be provided via:
    - `VITE_SYNC_API_USERNAME`
    - `VITE_SYNC_API_PASSWORD`
    - `VITE_SYNC_API_DISPLAY_NAME`
    - `VITE_SYNC_API_ROLE` (`student|teacher|admin|school_admin`)

In API mode, the Sync page shows `Sync adapter: api`.

### Backend tests
- `npm test`

### API bootstrap (env-driven)
Set these required variables in `apps/backend/.env`:
- `SEED_PROJECT_KEY`
- `SEED_PROJECT_NAME`
- `SEED_TENANT_ADMIN_USERNAME`
- `SEED_TENANT_ADMIN_PASSWORD`
- `SEED_PLATFORM_ADMIN_USERNAME`
- `SEED_PLATFORM_ADMIN_PASSWORD`
