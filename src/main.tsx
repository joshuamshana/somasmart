import "@/shared/i18n/i18n";
import "@/index.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { AppProviders } from "@/app/providers";
import { AppRouter } from "@/app/router";

if (import.meta.env.DEV) {
  import("@/mocks/browser").then(({ worker }) => worker.start());
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppProviders>
      <AppRouter />
    </AppProviders>
  </React.StrictMode>
);
