/**
 * Utility to access environment variables from both build-time and runtime sources
 */

/**
 * Creates an environment object that merges runtime and build-time environment variables
 * This allows Docker to inject environment variables at runtime that are accessible in client-side code
 */
export function createEnv() {
  // Return a proxy to handle dynamic access to environment variables
  return new Proxy({}, {
    get(target, prop) {
      // Check if we're in the browser and if window.RUNTIME_ENV exists
      // Use type assertion to fix TypeScript errors
      const win = typeof window !== 'undefined' ? window : undefined;
      const runtimeEnv = win ? win.RUNTIME_ENV : undefined;
      
      // Debug logging
      if (prop === 'PUBLIC_AUTHENTIK_CLIENT_ID') {
        console.log('🔍 Env utility debug:');
        console.log('- window available:', !!win);
        console.log('- window.RUNTIME_ENV available:', !!runtimeEnv);
        console.log('- window.RUNTIME_ENV keys:', runtimeEnv ? Object.keys(runtimeEnv) : 'none');
        console.log('- Using runtime env:', !!(win && runtimeEnv && prop in runtimeEnv) ? 'YES' : 'NO');
        console.log('- Value from runtime:', runtimeEnv ? runtimeEnv[prop] : 'none');
        console.log('- Value from build-time:', import.meta.env ? import.meta.env[prop] : 'none');
      }
      
      if (win && runtimeEnv && prop in runtimeEnv) {
        return runtimeEnv[prop];
      }
      
      // Fall back to build-time environment variables
      if (import.meta.env && prop in import.meta.env) {
        return import.meta.env[prop];
      }
      
      // Return undefined if the variable is not found
      return undefined;
    }
  });
}

// Generate a runtime-env.js script to inject environment variables at runtime
export function generateRuntimeEnvScript() {
  // Only run this on the server side
  if (typeof window !== 'undefined') return null;
  
  // Get all PUBLIC_ environment variables
  const envVars = {};
  
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith('PUBLIC_')) {
      envVars[key] = value;
    }
  }
  
  // Create a script that will be injected into the HTML
  return `window.RUNTIME_ENV = ${JSON.stringify(envVars)};`;
}

export default {
  createEnv,
  generateRuntimeEnvScript
};
