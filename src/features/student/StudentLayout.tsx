import React, { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Outlet, useLocation } from "react-router-dom";
import { SidebarNav } from "@/shared/ui/SidebarNav";
import { Button } from "@/shared/ui/Button";
import { useAuth } from "@/features/auth/authContext";

const groups = [
  {
    label: "Learning",
    items: [
      { label: "Dashboard", to: "/" },
      { label: "Lessons", to: "/student/lessons" },
      { label: "Progress", to: "/student/progress" }
    ]
  },
  {
    label: "Account",
    items: [
      { label: "Payments", to: "/student/payments" },
      { label: "Support", to: "/student/support" },
      { label: "Notifications", to: "/student/notifications" },
      { label: "Appearance", to: "/student/appearance" },
      { label: "Sync", to: "/student/sync" }
    ]
  }
] as const;

export function StudentLayout({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { logout } = useAuth();
  const location = useLocation();

  const title = location.pathname
    .replace("/student", "Student")
    .replaceAll("-", " ")
    .replaceAll("/", " / ");

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]" data-testid="student-layout">
      <aside className="hidden lg:block" data-testid="student-sidebar">
        <div
          className="sticky top-[72px] h-[calc(100vh-96px)] overflow-y-auto overscroll-contain rounded-xl border border-border bg-surface p-3 shadow-sm"
          data-testid="student-sidebar-panel"
        >
          <div className="mb-3 px-2 text-sm font-semibold text-text">Student</div>
          <SidebarNav groups={groups as any} />
          <div className="mt-6 border-t border-border pt-3">
            <Button className="w-full" variant="secondary" onClick={logout} data-testid="student-sidebar-logout">
              Logout
            </Button>
          </div>
        </div>
      </aside>

      <div className="lg:hidden" data-testid="student-mobile-header">
        <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-3 shadow-sm">
          <div className="text-sm font-semibold text-text">{title || "Student"}</div>
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
              <div className="fixed inset-0 bg-overlay/60" />
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
                  <Dialog.Panel className="max-h-[calc(100vh-2rem)] w-full max-w-sm overflow-y-auto overscroll-contain rounded-xl border border-border bg-surface p-3 shadow-lg">
                    <div className="mb-3 flex items-center justify-between gap-3 px-2">
                      <Dialog.Title className="text-sm font-semibold text-text">Student menu</Dialog.Title>
                      <button className="text-sm text-muted hover:text-text" onClick={() => setOpen(false)}>
                        Close
                      </button>
                    </div>
                    <SidebarNav groups={groups as any} onNavigate={() => setOpen(false)} />
                    <div className="mt-6 border-t border-border pt-3">
                      <Button
                        className="w-full"
                        variant="secondary"
                        onClick={() => {
                          setOpen(false);
                          logout();
                        }}
                        data-testid="student-drawer-logout"
                      >
                        Logout
                      </Button>
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>
      </div>

      <section className="min-w-0">{children ?? <Outlet />}</section>
    </div>
  );
}
