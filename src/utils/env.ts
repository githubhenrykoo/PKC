// Simple runtime env accessor aligned with our environment-variables rules
// Server-side code can access all variables; client-side should only rely on PUBLIC_* vars

export type RuntimeEnv = {
  PUBLIC_MCARD_API_URL: string;
  NODE_ENV: string;
  MODE?: string;
};

export function getRuntimeEnv(): RuntimeEnv {
  const env: any = import.meta.env || {};
  return {
    PUBLIC_MCARD_API_URL: env.PUBLIC_MCARD_API_URL || '',
    NODE_ENV: env.NODE_ENV || env.MODE || 'development',
    MODE: env.MODE || env.NODE_ENV,
  };
}
