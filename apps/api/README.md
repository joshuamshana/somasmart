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
npm run dev
```

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
