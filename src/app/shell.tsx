import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { OfflineBanner } from "@/shared/offline/OfflineBanner";
import { ToastViewport } from "@/shared/ui/Toast";
import { AppContainer } from "@/shared/ui/AppContainer";

export function AppShell() {
  const location = useLocation();
  const homeTarget = location.search ? `/${location.search}` : "/";
  return (
    <div className="min-h-full paper-canvas">
      <OfflineBanner />
      <ToastViewport />
      <header className="sticky top-0 z-30 border-b border-border-subtle bg-canvas/90 backdrop-blur">
        <AppContainer className="flex items-center justify-between py-4">
          <Link to={homeTarget} className="text-h3 text-text-title">
            SomaSmart
          </Link>
        </AppContainer>
      </header>
      <AppContainer className="py-5 md:py-6">
        <main>
          <Outlet />
        </main>
      </AppContainer>
    </div>
  );
}
