import React, { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Outlet, useLocation } from "react-router-dom";
import { SidebarNav } from "@/shared/ui/SidebarNav";
import { Button } from "@/shared/ui/Button";
import { useAuth } from "@/features/auth/authContext";

const groups = [
  {
    label: "School",
    items: [
      { label: "Dashboard", to: "/school" },
      { label: "Users", to: "/school/users" },
      { label: "Licenses", to: "/school/licenses" },
      { label: "Analytics", to: "/school/analytics" }
    ]
  },
  {
    label: "Tools",
    items: [
      { label: "Notifications", to: "/notifications" },
      { label: "Sync", to: "/sync" },
      { label: "Appearance", to: "/settings/appearance" }
    ]
  }
] as const;

export function SchoolLayout({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { logout } = useAuth();
  const location = useLocation();

  const title = location.pathname
    .replace("/school", "School")
    .replaceAll("-", " ")
    .replaceAll("/", " / ");

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]" data-testid="school-layout">
      <aside className="hidden lg:block" data-testid="school-sidebar">
        <div
          className="sticky top-[72px] h-[calc(100vh-96px)] overflow-y-auto overscroll-contain rounded-xl border border-border bg-surface p-3 shadow-sm"
          data-testid="school-sidebar-panel"
        >
          <div className="mb-3 px-2 text-sm font-semibold text-text">School</div>
          <SidebarNav groups={groups as any} />
          <div className="mt-6 border-t border-border pt-3">
            <Button className="w-full" variant="secondary" onClick={logout} data-testid="school-sidebar-logout">
              Logout
            </Button>
          </div>
        </div>
      </aside>

      <div className="lg:hidden" data-testid="school-mobile-header">
        <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-3 shadow-sm">
          <div className="text-sm font-semibold text-text">{title || "School"}</div>
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
                      <Dialog.Title className="text-sm font-semibold text-text">School menu</Dialog.Title>
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
                        data-testid="school-drawer-logout"
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
