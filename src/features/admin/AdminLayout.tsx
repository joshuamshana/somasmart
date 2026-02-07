import React, { Fragment, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Dialog, Transition } from "@headlessui/react";
import { SidebarNav } from "@/shared/ui/SidebarNav";
import { Button } from "@/shared/ui/Button";
import { useAuth } from "@/features/auth/authContext";

const groups = [
  {
    label: "Users",
    items: [
      { label: "Admin", to: "/admin" },
      { label: "Teachers", to: "/admin/teachers" },
      { label: "Students", to: "/admin/students" },
      { label: "School Admins", to: "/admin/school-admins" },
      { label: "Admins", to: "/admin/admins" }
    ]
  },
  {
    label: "Content",
    items: [
      { label: "Lessons", to: "/admin/lessons" },
      { label: "Coupons", to: "/admin/coupons" },
      { label: "Schools", to: "/admin/schools" }
    ]
  },
  {
    label: "Payments",
    items: [
      { label: "Payments", to: "/admin/payments" },
      { label: "Licenses", to: "/admin/licenses" }
    ]
  },
  {
    label: "System",
    items: [
      { label: "Analytics", to: "/admin/analytics" },
      { label: "Audit", to: "/admin/audit" },
      { label: "Settings", to: "/admin/settings" },
      { label: "Appearance", to: "/settings/appearance" },
      { label: "Notifications", to: "/notifications" },
      { label: "Support", to: "/admin/support" },
      { label: "Sync", to: "/sync" }
    ]
  }
] as const;

export function AdminLayout({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { logout } = useAuth();
  const location = useLocation();

  const title = location.pathname
    .replace("/admin", "Admin")
    .replaceAll("-", " ")
    .replaceAll("/", " / ");

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)] xl:gap-5" data-testid="admin-layout">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block" data-testid="admin-sidebar">
        <div
          className="paper-primary sticky top-[86px] h-[calc(100vh-108px)] overflow-y-auto overscroll-contain p-4"
          data-testid="admin-sidebar-panel"
        >
          <div className="mb-4 px-2 text-h3 text-text-title">Admin</div>
          <SidebarNav groups={groups as any} />
          <div className="mt-6 border-t border-border-subtle pt-3">
            <Button className="w-full" variant="secondary" tone="neutral" onClick={logout} data-testid="admin-sidebar-logout">
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile header + drawer */}
      <div className="lg:hidden" data-testid="admin-mobile-header">
        <div className="paper-secondary flex items-center justify-between p-3">
          <div className="text-sm font-semibold text-text-title">{title}</div>
          <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
            Menu
          </Button>
        </div>
        <Transition appear show={open} as={Fragment}>
          <Dialog as="div" className="fixed inset-0 z-50" onClose={() => setOpen(false)}>
            <Transition.Child as={Fragment} enter="duration-base ease-[var(--ease-emphasis)]" enterFrom="opacity-0" enterTo="opacity-100" leave="duration-fast ease-[var(--ease-standard)]" leaveFrom="opacity-100" leaveTo="opacity-0">
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
                      <Dialog.Title className="text-sm font-semibold text-text-title">Admin menu</Dialog.Title>
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
                        data-testid="admin-drawer-logout"
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
