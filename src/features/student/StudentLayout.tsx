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
    <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)] xl:gap-5" data-testid="student-layout">
      <aside className="hidden lg:block" data-testid="student-sidebar">
        <div
          className="paper-primary sticky top-[86px] h-[calc(100vh-108px)] overflow-y-auto overscroll-contain p-4"
          data-testid="student-sidebar-panel"
        >
          <div className="mb-4 px-2 text-h3 text-text-title">Student</div>
          <SidebarNav groups={groups as any} />
          <div className="mt-6 border-t border-border-subtle pt-3">
            <Button className="w-full" variant="secondary" tone="neutral" onClick={logout} data-testid="student-sidebar-logout">
              Logout
            </Button>
          </div>
        </div>
      </aside>

      <div className="lg:hidden" data-testid="student-mobile-header">
        <div className="paper-secondary flex items-center justify-between p-3">
          <div className="text-sm font-semibold text-text-title">{title || "Student"}</div>
          <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
            Menu
          </Button>
        </div>
        <Transition appear show={open} as={Fragment}>
          <Dialog as="div" className="fixed inset-0 z-50" onClose={() => setOpen(false)}>
            <Transition.Child
              as={Fragment}
              enter="duration-base ease-[var(--ease-emphasis)]"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="duration-fast ease-[var(--ease-standard)]"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-overlay/60" />
            </Transition.Child>
            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-start justify-center p-4">
                <Transition.Child
                  as={Fragment}
                  enter="duration-base ease-[var(--ease-emphasis)]"
                  enterFrom="opacity-0 translate-y-1.5 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="duration-fast ease-[var(--ease-standard)]"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 translate-y-1.5 scale-95"
                >
                  <Dialog.Panel className="paper-primary max-h-[calc(100vh-2rem)] w-full max-w-sm overflow-y-auto overscroll-contain p-3 shadow-lg">
                    <div className="mb-3 flex items-center justify-between gap-3 px-2">
                      <Dialog.Title className="text-sm font-semibold text-text-title">Student menu</Dialog.Title>
                      <button className="text-sm text-text-subtle hover:text-text-title" onClick={() => setOpen(false)}>
                        Close
                      </button>
                    </div>
                    <SidebarNav groups={groups as any} onNavigate={() => setOpen(false)} />
                    <div className="mt-6 border-t border-border-subtle pt-3">
                      <Button
                        className="w-full"
                        variant="secondary"
                        tone="neutral"
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
