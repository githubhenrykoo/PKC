import type { APIRoute } from "astro";
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
    
    // Include PUBLIC_ variables, feature flags, ThingsBoard credentials, and Telegram credentials
    if (key.startsWith('PUBLIC_') || 
        key === 'ENABLE_EXPERIMENTAL_FEATURES' || 
        key === 'VERSION' ||
        key.startsWith('THINGSBOARD_') ||
        key.startsWith('TELEGRAM_')) {
      envVars[key] = cleanValue;
    }
  });
  
  return envVars;
}

export const GET: APIRoute = () => {
  const envVars: Record<string, string> = {};
  let envFileRead = false;
  let actualFilePath = '';
  
  // Force console output to appear
  const timestamp = new Date().toISOString();
  console.log(`\n🔍 [${timestamp}] === RUNTIME ENV REQUEST ===`);
  console.log(`📂 Current working directory: ${process.cwd()}`);
  
  try {
    // Try multiple possible locations for the .env file
    const possiblePaths = [
      join(process.cwd(), '.env'),                    // Current working directory
      '/Users/alessandrorumampuk/Documents/GitHub/PKC/PKC/.env',  // Absolute path to your project
      join(process.cwd(), '../.env'),                 // Parent directory
      '/app/.env',                                    // Docker mount location
      join(__dirname, '.env'),                        // Same directory as built file
      join(__dirname, '../.env'),                     // Parent of built file
      join(__dirname, '../../.env'),                  // Two levels up from built file
      join(__dirname, '../../../.env'),               // Three levels up from built file
      join(__dirname, '../../../../.env'),            // Four levels up from built file
    ];
    
    console.log(`🔍 [${timestamp}] Trying ${possiblePaths.length} possible .env file locations...`);
    
    for (const envFilePath of possiblePaths) {
      try {
        console.log(`📁 [${timestamp}] Checking: ${envFilePath}`);
        const envContent = readFileSync(envFilePath, 'utf-8');
        const parsedVars = parseEnvFile(envContent);
        Object.assign(envVars, parsedVars);
        console.log(`✅ [${timestamp}] SUCCESS! Read .env from: ${envFilePath}`);
        console.log(`📋 [${timestamp}] Variables found:`, Object.keys(parsedVars));
        envFileRead = true;
        actualFilePath = envFilePath;
        break;
      } catch (fileError) {
        const errorMessage = fileError instanceof Error ? fileError.message : String(fileError);
        console.log(`❌ [${timestamp}] Failed at ${envFilePath}: ${errorMessage}`);
      }
    }
    
    // Only fall back to process.env if no .env file was found
    if (!envFileRead) {
      console.log(`⚠️ [${timestamp}] No .env file found at any location, falling back to process.env`);
      if (typeof process !== 'undefined' && process.env) {
        Object.keys(process.env).forEach(key => {
          if ((key.startsWith('PUBLIC_') || 
               key === 'ENABLE_EXPERIMENTAL_FEATURES' || 
               key === 'VERSION' ||
               key.startsWith('THINGSBOARD_') ||
               key.startsWith('TELEGRAM_')) && process.env[key]) {
            envVars[key] = process.env[key]!;
          }
        });
        console.log(`📋 [${timestamp}] Process.env variables:`, Object.keys(envVars));
      }
    }
  } catch (error) {
    console.error(`❌ [${timestamp}] Error reading environment variables:`, error);
  }
  
  // Ensure required fields have defaults
  const response = {
    // Google API Configuration
    PUBLIC_GOOGLE_API_KEY: envVars.PUBLIC_GOOGLE_API_KEY ?? "",
    PUBLIC_GOOGLE_CLIENT_ID: envVars.PUBLIC_GOOGLE_CLIENT_ID ?? "",
    PUBLIC_GOOGLE_CLIENT_SECRET: envVars.PUBLIC_GOOGLE_CLIENT_SECRET ?? "",
    
    // Notion API Configuration
    PUBLIC_NOTION_AUTH_URL: envVars.PUBLIC_NOTION_AUTH_URL ?? "",
    PUBLIC_NOTION_CLIENT_ID: envVars.PUBLIC_NOTION_CLIENT_ID ?? "",
    PUBLIC_NOTION_CLIENT_SECRET: envVars.PUBLIC_NOTION_CLIENT_SECRET ?? "",
    
    // Authentication
    PUBLIC_AUTH_URL: envVars.PUBLIC_AUTH_URL ?? "https://auth.pkc.pub",
    PUBLIC_AUTHENTIK_URL: envVars.PUBLIC_AUTHENTIK_URL ?? "https://auth.pkc.pub",
    PUBLIC_AUTHENTIK_CLIENT_ID: envVars.PUBLIC_AUTHENTIK_CLIENT_ID ?? "",
    PUBLIC_AUTHENTIK_CLIENT_SECRET: envVars.PUBLIC_AUTHENTIK_CLIENT_SECRET ?? "",
    PUBLIC_AUTHENTIK_REDIRECT_URI: envVars.PUBLIC_AUTHENTIK_REDIRECT_URI ?? "http://localhost:4321/auth/callback",
    
    // API Configuration
    PUBLIC_API_URL: envVars.PUBLIC_API_URL ?? "https://bmcard.pkc.pub/v1",
    PUBLIC_MCARD_API_URL: envVars.PUBLIC_MCARD_API_URL ?? "http://localhost:49384/v1",
    
    // ThingsBoard Configuration
    PUBLIC_THINGSBOARD_URL: envVars.PUBLIC_THINGSBOARD_URL ?? "https://tb.pkc.pub",
    THINGSBOARD_URL: envVars.THINGSBOARD_URL ?? "https://tb.pkc.pub",
    THINGSBOARD_USERNAME: envVars.THINGSBOARD_USERNAME ?? "",
    THINGSBOARD_PASSWORD: envVars.THINGSBOARD_PASSWORD ?? "",
    PUBLIC_THINGSBOARD_DASHBOARD_URL: envVars.PUBLIC_THINGSBOARD_DASHBOARD_URL ?? "",
    
    // Telegram Configuration
    TELEGRAM_BOT_TOKEN: envVars.TELEGRAM_BOT_TOKEN ?? "",
    TELEGRAM_CHAT_ID: envVars.TELEGRAM_CHAT_ID ?? "",
    TELEGRAM_PORT: envVars.TELEGRAM_PORT ?? "48637",
    
    // Feature flags
    ENABLE_EXPERIMENTAL_FEATURES: envVars.ENABLE_EXPERIMENTAL_FEATURES ?? "false",
    
    // Version info
    VERSION: envVars.VERSION ?? "1.0.0",
    BUILD_TIMESTAMP: new Date().toISOString(),
    
    // Debug info
    _DEBUG: {
      envFileRead: envFileRead,
      envVarsFound: Object.keys(envVars),
      currentWorkingDirectory: process.cwd(),
      actualFilePath: actualFilePath,
      timestamp: timestamp,
      requestTime: new Date().toISOString()
    }
  };
  
  // Log what we're returning for debugging
  console.log(`📤 [${timestamp}] Returning environment response:`);
  console.log(`   - Has Google credentials: ${!!(response.PUBLIC_GOOGLE_API_KEY && response.PUBLIC_GOOGLE_CLIENT_ID && response.PUBLIC_GOOGLE_CLIENT_SECRET)}`);
  console.log(`   - Has ThingsBoard credentials: ${!!(response.PUBLIC_THINGSBOARD_URL && response.THINGSBOARD_USERNAME && response.THINGSBOARD_PASSWORD)}`);
  console.log(`   - Has Telegram credentials: ${!!(response.TELEGRAM_BOT_TOKEN && response.TELEGRAM_CHAT_ID)}`);
  console.log(`   - Total variables: ${Object.keys(response).length - 1}`); // -1 for _DEBUG
  console.log(`   - File read from: ${actualFilePath || 'process.env fallback'}`);
  console.log(`   - Variables: ${Object.keys(envVars).join(', ')}`);
  console.log(`🔚 [${timestamp}] === END RUNTIME ENV REQUEST ===\n`);

  return new Response(
    JSON.stringify(response, null, 2),
    {
      headers: { 
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      },
    }
  );
};
