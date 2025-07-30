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
