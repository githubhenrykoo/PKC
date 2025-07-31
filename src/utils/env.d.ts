/**
 * TypeScript declarations for environment variables
 * This ensures type checking for all environment variable access
 */

declare interface EnvVariables {
  PUBLIC_AUTHENTIK_URL: string;
  PUBLIC_AUTHENTIK_CLIENT_ID: string;
  PUBLIC_AUTHENTIK_CLIENT_SECRET: string;
  PUBLIC_AUTHENTIK_REDIRECT_URI: string;
  PUBLIC_MCARD_API_URL: string;
  [key: string]: string | undefined;
}

declare module '../utils/env' {
  export const env: EnvVariables;
  export default env;
}

// Add window.RUNTIME_ENV declaration
interface Window {
  RUNTIME_ENV?: Record<string, string>;
}
