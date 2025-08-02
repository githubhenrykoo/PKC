/**
 * Application configuration
 * This centralizes all configuration settings for the application
 */

// Define a function to access environment variables safely
function getEnvVar(name: string): string | undefined {
  // Check browser environment with runtime injected variables
  if (typeof window !== 'undefined' && window.RUNTIME_ENV && window.RUNTIME_ENV[name]) {
    console.log(`Using runtime environment variable for ${name}: ${window.RUNTIME_ENV[name]}`);
    return window.RUNTIME_ENV[name];
  }
  
  // Check build-time environment variables
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[name]) {
    console.log(`Using build-time environment variable for ${name}: ${import.meta.env[name]}`);
    return import.meta.env[name];
  }
  
  console.warn(`Environment variable ${name} not found in any source`);
  return undefined;
}

// Create getter functions that can be called at runtime, ensuring they always return the latest value
export function getMcardApiUrl(): string {
  const url = getEnvVar('PUBLIC_MCARD_API_URL');
  return url || 'http://localhost:49384/v1'; // Fallback for safety
}

export function getRagApiUrl(): string {
  const url = getEnvVar('PUBLIC_RAG_API_URL');
  return url || 'http://localhost:28302/api/v1'; // Fallback for safety
}

// For backwards compatibility (deprecated - components should use getters instead)
export const MCARD_API_URL = typeof window === 'undefined' ? 'http://localhost:49384/v1' : undefined;
export const RAG_API_URL = typeof window === 'undefined' ? 'http://localhost:28302/api/v1' : undefined;

// Add TypeScript declaration for window.RUNTIME_ENV
declare global {
  interface Window {
    RUNTIME_ENV?: Record<string, string>;
  }
}
