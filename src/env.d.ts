/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_MCARD_API_URL: string;
  readonly PUBLIC_AUTHENTIK_URL: string;
  readonly PUBLIC_AUTHENTIK_CLIENT_ID: string;
  readonly PUBLIC_AUTHENTIK_CLIENT_SECRET?: string;
  readonly PUBLIC_AUTHENTIK_REDIRECT_URI: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Define the shape of the runtime environment object that will be available in the browser
interface RuntimeEnv {
  PUBLIC_MCARD_API_URL: string;
  PUBLIC_AUTHENTIK_URL: string;
  PUBLIC_AUTHENTIK_CLIENT_ID: string;
  PUBLIC_AUTHENTIK_CLIENT_SECRET?: string;
  PUBLIC_AUTHENTIK_REDIRECT_URI: string;
  [key: string]: string | undefined;
}

// Add RUNTIME_ENV to the global window object
declare global {
  interface Window {
    RUNTIME_ENV?: RuntimeEnv;
  }
}

// Define the exported env object type
declare module '@/utils/env' {
  export const env: RuntimeEnv;
}
