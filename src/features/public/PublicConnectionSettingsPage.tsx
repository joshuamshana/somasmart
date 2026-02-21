import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Card } from "@/shared/ui/Card";
import { Input } from "@/shared/ui/Input";
import { Button } from "@/shared/ui/Button";
import {
  DEFAULT_SYNC_API_BASE_URL,
  DEFAULT_SYNC_PROJECT_KEY,
  getEffectiveSyncConnection
} from "@/shared/sync/config";
import { resetSyncConnectionOverride, saveSyncConnectionOverride } from "@/shared/sync/connectionSettings";

export function PublicConnectionSettingsPage() {
  const location = useLocation();
  const search = location.search ?? "";
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState(() => {
    const effective = getEffectiveSyncConnection();
    return {
      baseUrl: effective.baseUrl,
      projectKey: effective.projectKey
    };
  });

  return (
    <Card title="Connection settings">
      <div className="space-y-4">
        <Input
          label="Backend URL"
          placeholder="http://localhost:4000"
          value={draft.baseUrl}
          onChange={(e) => {
            setError(null);
            setMessage(null);
            setDraft((prev) => ({ ...prev, baseUrl: e.target.value }));
          }}
        />
        <Input
          label="Project key"
          value={draft.projectKey}
          onChange={(e) => {
            setError(null);
            setMessage(null);
            setDraft((prev) => ({ ...prev, projectKey: e.target.value }));
          }}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              try {
                const saved = saveSyncConnectionOverride(draft);
                setDraft(saved);
                setError(null);
                setMessage("Connection settings saved.");
              } catch (saveError) {
                setMessage(null);
                setError(saveError instanceof Error ? saveError.message : "Unable to save connection settings.");
              }
            }}
          >
            Save
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              resetSyncConnectionOverride();
              setDraft({
                baseUrl: DEFAULT_SYNC_API_BASE_URL,
                projectKey: DEFAULT_SYNC_PROJECT_KEY
              });
              setError(null);
              setMessage("Connection settings reset to defaults.");
            }}
          >
            Reset to defaults
          </Button>
        </div>
        {error ? <div className="text-sm text-status-danger">{error}</div> : null}
        {message ? <div className="text-sm text-text">{message}</div> : null}
        <div className="text-xs text-text-subtle">
          Use full backend URL with protocol, e.g. <span className="font-mono">http://localhost:4000</span>.
        </div>
        <div className="text-xs text-text-subtle">
          Default endpoint is <span className="font-mono">{DEFAULT_SYNC_API_BASE_URL}</span>. This setting is local to this
          device/browser.
        </div>
        <div className="text-xs text-text-subtle">
          Need backend contract details?{" "}
          <Link className="text-action-primary-active underline" to={`/help/backend-integration${search}`}>
            Open integration guide
          </Link>
          .
        </div>
      </div>
    </Card>
  );
}
