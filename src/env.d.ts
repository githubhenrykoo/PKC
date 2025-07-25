/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_MCARD_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
