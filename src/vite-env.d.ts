/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_BASE?: string;
  readonly VITE_ROUTER_MODE?: "auto" | "browser" | "hash";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
