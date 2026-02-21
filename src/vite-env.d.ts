/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SYNC_MODE?: "mock" | "api";
  readonly VITE_SYNC_API_URL?: string;
  readonly VITE_SYNC_ACCESS_TOKEN?: string;
  readonly VITE_SYNC_DEVICE_ID?: string;
  readonly VITE_SYNC_PROJECT_KEY?: string;
  readonly VITE_SYNC_API_USERNAME?: string;
  readonly VITE_SYNC_API_PASSWORD?: string;
  readonly VITE_SYNC_API_DISPLAY_NAME?: string;
  readonly VITE_SYNC_API_ROLE?: "student" | "teacher" | "admin" | "school_admin";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
