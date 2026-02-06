import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { OfflineBanner } from "@/shared/offline/OfflineBanner";
import { ToastViewport } from "@/shared/ui/Toast";

export function AppShell() {
  const location = useLocation();
  const homeTarget = location.search ? `/${location.search}` : "/";
  return (
    <div className="min-h-full">
      <OfflineBanner />
      <ToastViewport />
      <header className="sticky top-0 z-10 border-b border-border bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to={homeTarget} className="font-semibold">
            SomaSmart
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
