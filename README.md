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

## Seeded accounts (MVP)
- Admin: `admin / admin123`
- Teacher: `teacher1 / teacher123`
- School Admin: `schooladmin / school123` (School code: `SOMA001`)

Students can self-register. Teachers self-register as **pending** until approved by admin.

## Tests
- Unit/component: `npm test`
- Unit/component coverage (100% gated scope): `npm run test:coverage:ci`
- Journey + requirements matrix validation: `npm run test:journeys:matrix`
- E2E: `npm run test:e2e`
- Full CI order locally: `npm run ci`

## Docs
- `docs/requirements.md`
- `docs/coverage-matrix.md`
- `docs/data-model.md`
- `docs/p0-journeys.md`
# somasmart
# somasmart
# somasmart
