import React, { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Outlet, useLocation } from "react-router-dom";
import { SidebarNav } from "@/shared/ui/SidebarNav";
import { Button } from "@/shared/ui/Button";

const groups = [
  {
    label: "Teaching",
    items: [
      { label: "Dashboard", to: "/teacher" },
      { label: "My lessons", to: "/teacher/lessons" },
      { label: "Create lesson", to: "/teacher/lessons/new" }
    ]
  },
  {
    label: "Tools",
    items: [
      { label: "Support", to: "/teacher/support" },
      { label: "Notifications", to: "/notifications" },
      { label: "Sync", to: "/sync" }
    ]
  }
] as const;

export function TeacherLayout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const title = location.pathname
    .replace("/teacher", "Teacher")
    .replaceAll("-", " ")
    .replaceAll("/", " / ");

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]" data-testid="teacher-layout">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block" data-testid="teacher-sidebar">
        <div className="sticky top-[72px] rounded-xl border border-border bg-surface p-3 shadow-sm">
          <div className="mb-3 px-2 text-sm font-semibold text-text">Teacher</div>
          <SidebarNav groups={groups as any} />
        </div>
      </aside>

      {/* Mobile header + drawer */}
      <div className="lg:hidden" data-testid="teacher-mobile-header">
        <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-3 shadow-sm">
          <div className="text-sm font-semibold text-text">{title}</div>
          <Button variant="secondary" onClick={() => setOpen(true)}>
            Menu
          </Button>
        </div>
        <Transition appear show={open} as={Fragment}>
          <Dialog as="div" className="fixed inset-0 z-50" onClose={() => setOpen(false)}>
            <Transition.Child
              as={Fragment}
              enter="duration-0"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="duration-0"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black/60" />
            </Transition.Child>
            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-start justify-center p-4">
                <Transition.Child
                  as={Fragment}
                  enter="duration-0"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="duration-0"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                >
                  <Dialog.Panel className="w-full max-w-sm rounded-xl border border-border bg-surface p-3 shadow-lg">
                    <div className="mb-3 flex items-center justify-between gap-3 px-2">
                      <Dialog.Title className="text-sm font-semibold text-text">Teacher menu</Dialog.Title>
                      <button className="text-sm text-muted hover:text-text" onClick={() => setOpen(false)}>
                        Close
                      </button>
                    </div>
                    <SidebarNav groups={groups as any} onNavigate={() => setOpen(false)} />
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>
      </div>

      <section className="min-w-0">
        <Outlet />
      </section>
    </div>
  );
}

