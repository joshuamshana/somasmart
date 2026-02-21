import React from "react";
import { useOnlineStatus } from "@/shared/offline/useOnlineStatus";
import { getSyncMode } from "@/shared/sync/config";

export function OfflineBanner() {
  const online = useOnlineStatus();
  const mode = getSyncMode();
  return (
    <div className={`w-full ${online ? "bg-success" : "bg-warning"}`}>
      <div className="mx-auto max-w-6xl px-4 py-2 text-xs font-medium">
        {online
          ? mode === "api"
            ? "Online: sync available (backend API)"
            : "Online: sync available (mocked)"
          : "Offline: working from local content"}
      </div>
    </div>
  );
}
