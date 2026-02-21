import { clearSyncApiSession } from "@/shared/sync/api/syncApiSession";
import { clearSyncConnectionOverride, setSyncConnectionOverride, type SyncConnectionOverride } from "@/shared/sync/config";

export function saveSyncConnectionOverride(input: SyncConnectionOverride) {
  const normalized = setSyncConnectionOverride(input);
  clearSyncApiSession();
  return normalized;
}

export function resetSyncConnectionOverride() {
  clearSyncConnectionOverride();
  clearSyncApiSession();
}
