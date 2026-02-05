import React, { useEffect, useState } from "react";
import clsx from "clsx";
import { dismiss, subscribeToasts, type ToastItem } from "@/shared/ui/toastStore";

export function ToastViewport() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => {
    return subscribeToasts(setItems);
  }, []);

  return (
    <div className="fixed right-4 top-4 z-[60] flex w-[320px] flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className={clsx(
            "rounded-lg border p-3 shadow-md",
            t.type === "success" && "border-success/30 bg-surface text-text",
            t.type === "error" && "border-danger/30 bg-surface text-text",
            t.type === "info" && "border-info/30 bg-surface text-text"
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">{t.title}</div>
              {t.description ? <div className="mt-1 text-sm text-muted">{t.description}</div> : null}
            </div>
            <button className="text-sm text-muted hover:text-text" onClick={() => dismiss(t.id)}>
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
