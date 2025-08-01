// Runtime environment variables endpoint
// This provides a reliable way to get environment variables in both development and production

import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  // Get all environment variables that start with PUBLIC_
  const envVars: Record<string, string> = {};
  
  // In development and production, extract PUBLIC_ variables
  if (typeof process !== 'undefined' && process.env) {
    Object.keys(process.env).forEach(key => {
      if (key.startsWith('PUBLIC_') && process.env[key]) {
        envVars[key] = process.env[key]!;
      }
    });
  }
  
  // Note: In server context, we rely on process.env which contains all environment variables
  // including those from .env files and Docker environment
  
  // Generate JavaScript that sets window.RUNTIME_ENV
  const jsContent = `// Auto-generated runtime environment variables
window.RUNTIME_ENV = ${JSON.stringify(envVars, null, 2)};
console.log('Runtime environment variables loaded:', window.RUNTIME_ENV);`;

  return new Response(jsContent, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
};
