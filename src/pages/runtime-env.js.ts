// Runtime environment variables endpoint
// This dynamically reads from the mounted .env file on every request

import type { APIRoute } from 'astro';
import { readFileSync } from 'fs';
import { join } from 'path';

// Function to parse .env file content
function parseEnvFile(content: string): Record<string, string> {
  const envVars: Record<string, string> = {};
  
  content.split('\n').forEach(line => {
    // Skip empty lines and comments
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    
    // Parse KEY=VALUE format
    const equalIndex = line.indexOf('=');
    if (equalIndex === -1) return;
    
    const key = line.substring(0, equalIndex).trim();
    const value = line.substring(equalIndex + 1).trim();
    
    // Remove quotes if present
    const cleanValue = value.replace(/^["']|["']$/g, '');
    
    // Only include PUBLIC_ variables
    if (key.startsWith('PUBLIC_')) {
      envVars[key] = cleanValue;
    }
  });
  
  return envVars;
}

export const GET: APIRoute = async () => {
  const envVars: Record<string, string> = {};
  
  try {
    // Try to read from mounted .env file first (Docker volume mount)
    const envFilePath = join(process.cwd(), '.env');
    try {
      const envContent = readFileSync(envFilePath, 'utf-8');
      const parsedVars = parseEnvFile(envContent);
      Object.assign(envVars, parsedVars);
      console.log('✅ Successfully read environment variables from mounted .env file');
    } catch (fileError) {
      console.log('📁 No mounted .env file found, falling back to process.env');
      
      // Fallback to process.env for development
      if (typeof process !== 'undefined' && process.env) {
        Object.keys(process.env).forEach(key => {
          if (key.startsWith('PUBLIC_') && process.env[key]) {
            envVars[key] = process.env[key]!;
          }
        });
      }
    }
  } catch (error) {
    console.error('❌ Error reading environment variables:', error);
  }
  
  // Generate JavaScript that sets window.RUNTIME_ENV
  const jsContent = `// Auto-generated runtime environment variables (from mounted .env file)
window.RUNTIME_ENV = ${JSON.stringify(envVars, null, 2)};
console.log('✅ Runtime environment variables loaded from .env file:', window.RUNTIME_ENV);`;

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
