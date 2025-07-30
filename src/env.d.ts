/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_MCARD_API_URL: string;
  readonly PUBLIC_AUTHENTIK_URL: string;
  readonly PUBLIC_AUTHENTIK_CLIENT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
