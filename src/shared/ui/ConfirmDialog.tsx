import React, { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/shared/ui/Button";
import { Dialog, Transition } from "@headlessui/react";

type Props = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  danger?: boolean;
  requireText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  danger,
  requireText,
  onConfirm,
  onCancel
}: Props) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const firstFocusRef = useRef<HTMLInputElement | null>(null);

  const canConfirm = useMemo(() => {
    if (!requireText) return true;
    return typed.trim().toUpperCase() === requireText.trim().toUpperCase();
  }, [requireText, typed]);

  useEffect(() => {
    if (!open) return;
    setTyped("");
    setBusy(false);
  }, [open]);

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog
        as="div"
        className="fixed inset-0 z-50"
        initialFocus={firstFocusRef}
        onClose={() => (busy ? null : onCancel())}
      >
        <Transition.Child as={Fragment} enter="duration-0" enterFrom="opacity-0" enterTo="opacity-100" leave="duration-0" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/60" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="duration-0"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="duration-0"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-lg rounded-xl border border-border bg-surface p-4 shadow-lg">
                <Dialog.Title className="text-lg font-semibold text-text">{title}</Dialog.Title>
                {description ? <Dialog.Description className="mt-2 text-sm text-muted">{description}</Dialog.Description> : null}

                {requireText ? (
                  <div className="mt-4">
                    <div className="text-sm text-muted">
                      Type <span className="font-mono text-text">{requireText}</span> to confirm.
                    </div>
                    <input
                      ref={firstFocusRef}
                      className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-brand"
                      value={typed}
                      onChange={(e) => setTyped(e.target.value)}
                      placeholder={requireText}
                      aria-label="Confirm text"
                    />
                  </div>
                ) : null}

                <div className="mt-5 flex justify-end gap-2">
                  <Button variant="secondary" onClick={onCancel} disabled={busy}>
                    Cancel
                  </Button>
                  <Button
                    variant={danger ? "danger" : undefined}
                    onClick={async () => {
                      if (!canConfirm) return;
                      setBusy(true);
                      try {
                        await onConfirm();
                      } finally {
                        setBusy(false);
                      }
                    }}
                    disabled={!canConfirm || busy}
                  >
                    {busy ? "Working…" : confirmLabel}
                  </Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
