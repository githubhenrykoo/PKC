/// <reference types="astro/client" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly PUBLIC_MCARD_API_URL: string;
  readonly PUBLIC_AUTHENTIK_URL: string;
  readonly PUBLIC_AUTHENTIK_CLIENT_ID: string;
  readonly PUBLIC_AUTHENTIK_CLIENT_SECRET?: string;
  readonly PUBLIC_AUTHENTIK_REDIRECT_URI: string;
  // Vite/Astro standard fields (added to satisfy type-checks in .astro/.ts files)
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
  readonly BASE_URL: string;
  readonly SSR?: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
