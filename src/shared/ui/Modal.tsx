import React, { Fragment, useEffect, useRef } from "react";
import { Dialog, Transition } from "@headlessui/react";

export function Modal({
  open,
  title,
  onClose,
  children
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const lastActiveRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    lastActiveRef.current = document.activeElement as HTMLElement | null;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    return () => {
      lastActiveRef.current?.focus?.();
    };
  }, [open, onClose]);

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="fixed inset-0 z-50" onClose={onClose}>
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
                <div className="mb-3 flex items-start justify-between gap-3">
                  <Dialog.Title className="text-base font-semibold text-text">{title}</Dialog.Title>
                  <button className="text-sm text-muted hover:text-text" onClick={onClose}>
                    Close
                  </button>
                </div>
                {children}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
