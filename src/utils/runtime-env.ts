// Runtime environment configuration for the client
import type { RuntimeEnv } from '../types/global';

// Default environment variables - these will be overridden by the actual environment
const defaultEnv: RuntimeEnv = {
  // Core configuration
  PUBLIC_API_URL: 'https://bmcard.pkc.pub/v1',
  
  // Authentication
  PUBLIC_AUTH_URL: 'https://auth.pkc.pub',
  PUBLIC_AUTHENTIK_URL: 'https://auth.pkc.pub',
  PUBLIC_AUTHENTIK_CLIENT_ID: '',
  PUBLIC_AUTHENTIK_CLIENT_SECRET: '',
  PUBLIC_AUTHENTIK_REDIRECT_URI: '',
  
  // MCard API
  PUBLIC_MCARD_API_URL: 'https://mcard.pkc.pub/api',
  
  // Google API Credentials (loaded from environment variables)
  PUBLIC_GOOGLE_API_KEY: '',
  PUBLIC_GOOGLE_CLIENT_ID: '',
  PUBLIC_GOOGLE_CLIENT_SECRET: '',
  
  // Feature flags (as strings)
  ENABLE_EXPERIMENTAL_FEATURES: 'false',
  
  // Version info
  VERSION: '1.0.0',
  BUILD_TIMESTAMP: new Date().toISOString()
};

// Global window.RUNTIME_ENV is already declared in global.d.ts

// Initialize the window.RUNTIME_ENV object with defaults early
if (typeof window !== 'undefined') {
  window.RUNTIME_ENV = { ...defaultEnv };
  // Provide a helper for safe access
  window.getEnv = <T extends string | number | boolean>(key: string, defaultValue: T): T => {
    const value = window.RUNTIME_ENV?.[key];
    if (value === undefined) return defaultValue;
    if (typeof defaultValue === 'boolean') return (value.toLowerCase() === 'true') as unknown as T;
    if (typeof defaultValue === 'number') return parseFloat(value) as unknown as T;
    return value as unknown as T;
  };
}

/**
 * Initialize the runtime environment
 * Loads environment variables from the server in production,
 * falls back to defaults if needed
 */
export const initRuntimeEnv = async (): Promise<void> => {
  try {
    // Always attempt to load environment variables from the server
    const response = await fetch('/runtime-env.json', { cache: 'no-store' });
    if (response.ok) {
      const env = await response.json() as Partial<RuntimeEnv>;
      if (typeof window !== 'undefined') {
        window.RUNTIME_ENV = { ...defaultEnv, ...env } as RuntimeEnv;
        console.log('✅ Loaded runtime environment variables from /runtime-env.json');
        window.dispatchEvent(new Event('runtime-env-loaded'));
      }
      return;
    }
    console.warn('⚠️ /runtime-env.json not found or not ok, falling back to defaults');
  } catch (error) {
    console.warn('⚠️ Error loading /runtime-env.json, falling back to defaults', error);
  }

  // Fallback: ensure defaults are set and notify listeners
  if (typeof window !== 'undefined') {
    window.RUNTIME_ENV = { ...defaultEnv };
    window.dispatchEvent(new Event('runtime-env-loaded'));
  }
};

/**
 * Safely get an environment variable with a default value
 * @param key The environment variable key
 * @param defaultValue The default value to return if the key is not found
 * @returns The environment variable value or the default value
 */
export const getEnv = <T extends string | number | boolean>(
  key: string,
  defaultValue: T
): T => {
  if (typeof window === 'undefined') {
    return defaultValue;
  }
  
  const value = window.RUNTIME_ENV?.[key];
  if (value === undefined) {
    return defaultValue;
  }
  
  // Convert string values to the expected type
  if (typeof defaultValue === 'boolean') {
    return (value.toLowerCase() === 'true') as unknown as T;
  } else if (typeof defaultValue === 'number') {
    return parseFloat(value) as unknown as T;
  }
  
  return value as unknown as T;
};

export default {
  init: initRuntimeEnv,
  get: getEnv
};
