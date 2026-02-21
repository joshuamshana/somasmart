# Mobile Architecture

## Layers
- `presentation/`: Flutter UI, route pages, shell navigation.
- `application/`: Riverpod providers for auth, theme, sync status.
- `domain/`: typed models and repository contracts.
- `data/`: API client, Drift local DB, repository implementation, sync mapping.

## Storage model
- Generic JSON entity store table (`json_records`) keyed by `(bucket, record_id)`.
- Outbox table for queued/synced/failed events.
- Key/value table for checkpoints, session pointers, preferences.

## Sync flow
- Blob cache: lesson asset `cid` entries are validated with `/sync/blobs/need` and fetched via `/sync/blob/:cid` into local file cache for media playback.

1. Read queued/failed outbox events.
2. Map local outbox type -> backend sync events (`entityType`, `entityId`, `op`, `data`).
3. POST `/sync/push` with idempotent event ids.
4. POST `/sync/pull` from saved checkpoint.
5. Apply upserts/deletes to local JSON store.
6. Persist new checkpoint and last sync time.

## Routing
- Public: `/login`, `/register`.
- Student shell tabs:
  - `/` dashboard
  - `/lessons` and `/lessons/:lessonId`
  - `/progress`
  - `/payments`
  - `/account` (`support`, `notifications`, `sync`, `appearance`)

## Theming
- Material 3 with explicit light/dark themes.
- Persisted user preference (`light|dark|system`) in local KV store.

## Build and runtime config
- Dart defines:
  - `API_BASE_URL` (default `http://10.0.2.2:4000`)
  - `PROJECT_KEY` (default `somasmart`)
  - `DEVICE_ID` (default `android_student_mobile`)

## Runtime connection overrides
- Runtime backend override is stored per-device in local key-value storage.
- Precedence:
  1. Runtime override
  2. Dart define (`API_BASE_URL`, `PROJECT_KEY`)
  3. Defaults (`http://10.0.2.2:4000`, `somasmart`)
- Save/reset clears sync API session tokens to force re-auth against selected backend.
