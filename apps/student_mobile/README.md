# SomaSmart Student Mobile

## Runtime backend connection settings

The app supports runtime, per-device connection settings (no rebuild required).

- Public route: `/connection-settings`
- Account route: `/account/connection-settings`
- Backend help: `/help/backend-integration`

Connection precedence:
1. Runtime override saved on device
2. Compile-time defines (`API_BASE_URL`, `PROJECT_KEY`)
3. Defaults (`http://10.0.2.2:4000`, `somasmart`)

Validation rules:
- Backend URL must be absolute with protocol (`http://` or `https://`)
- Project key must match `^[a-zA-Z0-9_-]{2,64}$`

Save/reset clears sync API tokens so next auth/sync re-establishes against the selected backend.

## Build-time defines

- `API_BASE_URL` (optional)
- `PROJECT_KEY` (optional)
- `DEVICE_ID` (optional)

Default values:
- `API_BASE_URL=http://10.0.2.2:4000`
- `PROJECT_KEY=somasmart`
- `DEVICE_ID=android_student_mobile`
