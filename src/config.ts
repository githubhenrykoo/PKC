/**
 * Application configuration
 * This centralizes all configuration settings for the application
 */

// Define a function to access environment variables safely
function getEnvVar(name: string): string | undefined {
  // Check browser environment with runtime injected variables
  if (typeof window !== 'undefined' && window.RUNTIME_ENV && window.RUNTIME_ENV[name]) {
    return window.RUNTIME_ENV[name];
  }
  
  // Check build-time environment variables
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[name]) {
    return import.meta.env[name];
  }
  
  return undefined;
}

// Always use the environment variable from .env
// No hardcoded fallbacks - require proper environment configuration
export const MCARD_API_URL = getEnvVar('PUBLIC_MCARD_API_URL');

// Log the selected API URL during initialization
console.log('MCARD_API_URL configured as:', MCARD_API_URL);

// Add TypeScript declaration for window.RUNTIME_ENV
declare global {
  interface Window {
    RUNTIME_ENV?: Record<string, string>;
  }
}
