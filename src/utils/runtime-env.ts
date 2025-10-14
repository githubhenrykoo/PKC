// Runtime environment configuration for the client
// This module provides runtime access to environment variables
// It loads from /runtime-env.json endpoint which reads from mounted .env file

export interface RuntimeEnv {
  // Google API Configuration
  PUBLIC_GOOGLE_API_KEY: string;
  PUBLIC_GOOGLE_CLIENT_ID: string;
  PUBLIC_GOOGLE_CLIENT_SECRET: string;
  
  // Notion API Configuration
  PUBLIC_NOTION_AUTH_URL: string;
  PUBLIC_NOTION_CLIENT_ID: string;
  PUBLIC_NOTION_CLIENT_SECRET: string;
  
  // Authentication
  PUBLIC_AUTH_URL: string;
  PUBLIC_AUTHENTIK_URL: string;
  PUBLIC_AUTHENTIK_CLIENT_ID: string;
  PUBLIC_AUTHENTIK_CLIENT_SECRET: string;
  PUBLIC_AUTHENTIK_REDIRECT_URI: string;
  
  // API Configuration
  PUBLIC_API_URL: string;
  PUBLIC_MCARD_API_URL: string;
  
  // ThingsBoard Configuration
  PUBLIC_THINGSBOARD_URL: string;
  THINGSBOARD_URL: string;
  THINGSBOARD_USERNAME: string;
  THINGSBOARD_PASSWORD: string;
  PUBLIC_THINGSBOARD_DASHBOARD_URL: string;
  
  // Telegram Configuration
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHAT_ID: string;
  TELEGRAM_PORT: string;
  
  // Feature flags (stored as strings)
  ENABLE_EXPERIMENTAL_FEATURES: string;
  
  // Version info
  VERSION: string;
  BUILD_TIMESTAMP: string;
  
  // Index signature for compatibility
  [key: string]: string;
}

// Default environment values
const defaultEnv: RuntimeEnv = {
  // Google API Configuration
  PUBLIC_GOOGLE_API_KEY: '',
  PUBLIC_GOOGLE_CLIENT_ID: '',
  PUBLIC_GOOGLE_CLIENT_SECRET: '',
  
  // Notion API Configuration
  PUBLIC_NOTION_AUTH_URL: '',
  PUBLIC_NOTION_CLIENT_ID: '',
  PUBLIC_NOTION_CLIENT_SECRET: '',
  
  // Authentication
  PUBLIC_AUTH_URL: 'https://auth.pkc.pub',
  PUBLIC_AUTHENTIK_URL: 'https://auth.pkc.pub',
  PUBLIC_AUTHENTIK_CLIENT_ID: '',
  PUBLIC_AUTHENTIK_CLIENT_SECRET: '',
  PUBLIC_AUTHENTIK_REDIRECT_URI: 'http://localhost:4321/auth/callback',
  
  // API Configuration
  PUBLIC_API_URL: 'https://bmcard.pkc.pub/v1',
  PUBLIC_MCARD_API_URL: 'http://localhost:49384/v1',
  
  // ThingsBoard Configuration
  PUBLIC_THINGSBOARD_URL: 'https://tb.pkc.pub',
  THINGSBOARD_URL: 'https://tb.pkc.pub',
  THINGSBOARD_USERNAME: '',
  THINGSBOARD_PASSWORD: '',
  PUBLIC_THINGSBOARD_DASHBOARD_URL: '',
  
  // Telegram Configuration
  TELEGRAM_BOT_TOKEN: '',
  TELEGRAM_CHAT_ID: '',
  TELEGRAM_PORT: '48637',
  
  // Feature flags
  ENABLE_EXPERIMENTAL_FEATURES: 'false',
  
  // Version info
  VERSION: '1.0.0',
  BUILD_TIMESTAMP: new Date().toISOString()
};

// Initialize the window.RUNTIME_ENV object with defaults early
if (typeof window !== 'undefined') {
  window.RUNTIME_ENV = { ...defaultEnv };
}

/**
 * Initialize the runtime environment
 * Loads environment variables from the server dynamically,
 * falls back to defaults if needed
 */
export const initRuntimeEnv = async (): Promise<void> => {
  try {
    // Always attempt to load environment variables from the server with cache busting
    const timestamp = Date.now();
    const response = await fetch(`/runtime-env.json?t=${timestamp}`, { 
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    if (response.ok) {
      const env = await response.json() as Partial<RuntimeEnv>;
      if (typeof window !== 'undefined') {
        const previousEnv = { ...window.RUNTIME_ENV };
        window.RUNTIME_ENV = { ...defaultEnv, ...env } as RuntimeEnv;
        
        // Check if environment has changed
        const hasChanged = JSON.stringify(previousEnv) !== JSON.stringify(window.RUNTIME_ENV);
        
        if (hasChanged) {
          console.log('🔄 Environment variables updated:', {
            previous: previousEnv,
            current: window.RUNTIME_ENV,
            timestamp: new Date().toISOString()
          });
          
          // Dispatch custom event for components to react to changes
          window.dispatchEvent(new CustomEvent('runtime-env-changed', { 
            detail: { 
              previous: previousEnv, 
              current: window.RUNTIME_ENV,
              timestamp: new Date().toISOString()
            } 
          }));
        } else {
          console.log('✅ Environment variables loaded (no changes):', window.RUNTIME_ENV);
        }
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
    window.RUNTIME_ENV = { ...defaultEnv } as RuntimeEnv;
    window.dispatchEvent(new Event('runtime-env-loaded'));
  }
};

/**
 * Start periodic environment refresh
 * Checks for environment changes every 5 seconds
 */
export const startEnvironmentWatcher = (): void => {
  if (typeof window === 'undefined') return;
  
  console.log('🔍 Starting environment watcher (5s interval)');
  
  // Initial load
  initRuntimeEnv();
  
  // Set up periodic refresh
  const intervalId = setInterval(() => {
    initRuntimeEnv().catch(error => {
      console.warn('⚠️ Environment refresh failed:', error);
    });
  }, 5000); // Check every 5 seconds
  
  // Store interval ID for cleanup
  (window as any).__envWatcherInterval = intervalId;
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    if ((window as any).__envWatcherInterval) {
      clearInterval((window as any).__envWatcherInterval);
    }
  });
};

/**
 * Stop the environment watcher
 */
export const stopEnvironmentWatcher = (): void => {
  if (typeof window !== 'undefined' && (window as any).__envWatcherInterval) {
    clearInterval((window as any).__envWatcherInterval);
    (window as any).__envWatcherInterval = null;
    console.log('🛑 Environment watcher stopped');
  }
};

/**
 * Get environment variable with type safety and fallback
 */
export const getEnv = <T extends string | number | boolean>(key: keyof RuntimeEnv, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  
  const value = window.RUNTIME_ENV?.[key];
  if (value === undefined || value === '') return defaultValue;
  
  if (typeof defaultValue === 'boolean') {
    return (value.toLowerCase() === 'true') as unknown as T;
  }
  if (typeof defaultValue === 'number') {
    const parsed = parseFloat(value);
    return (isNaN(parsed) ? defaultValue : parsed) as unknown as T;
  }
  return value as unknown as T;
};

/**
 * Check if environment variables are properly configured
 */
export const validateEnvironment = (): { isValid: boolean; missing: string[]; warnings: string[] } => {
  if (typeof window === 'undefined') {
    return { isValid: false, missing: ['window object not available'], warnings: [] };
  }
  
  const env = window.RUNTIME_ENV || {};
  const missing: string[] = [];
  const warnings: string[] = [];
  
  // Check required Google API credentials
  if (!env.PUBLIC_GOOGLE_API_KEY) missing.push('PUBLIC_GOOGLE_API_KEY');
  if (!env.PUBLIC_GOOGLE_CLIENT_ID) missing.push('PUBLIC_GOOGLE_CLIENT_ID');
  if (!env.PUBLIC_GOOGLE_CLIENT_SECRET) missing.push('PUBLIC_GOOGLE_CLIENT_SECRET');
  
  // Check MCard API URL
  if (!env.PUBLIC_MCARD_API_URL) missing.push('PUBLIC_MCARD_API_URL');
  
  // Check for placeholder values
  if (env.PUBLIC_GOOGLE_API_KEY === 'your_google_api_key_here') {
    warnings.push('PUBLIC_GOOGLE_API_KEY appears to be a placeholder value');
  }
  if (env.PUBLIC_GOOGLE_CLIENT_ID === 'your_google_client_id_here') {
    warnings.push('PUBLIC_GOOGLE_CLIENT_ID appears to be a placeholder value');
  }
  
  return {
    isValid: missing.length === 0,
    missing,
    warnings
  };
};

/**
 * Display environment status in console
 */
export const logEnvironmentStatus = (): void => {
  if (typeof window === 'undefined') return;
  
  const validation = validateEnvironment();
  const env = window.RUNTIME_ENV || {};
  
  console.group('🔧 Environment Configuration Status');
  console.log('📊 Current Environment:', env);
  console.log('✅ Valid:', validation.isValid);
  
  if (validation.missing.length > 0) {
    console.warn('❌ Missing Variables:', validation.missing);
  }
  
  if (validation.warnings.length > 0) {
    console.warn('⚠️ Warnings:', validation.warnings);
  }
  
  console.log('🕐 Last Updated:', new Date().toISOString());
  console.groupEnd();
};

/**
 * Get Google Calendar credentials from runtime environment
 */
export const getGoogleCredentials = () => {
  if (typeof window === 'undefined') return null;
  
  const env = window.RUNTIME_ENV || {};
  return {
    apiKey: env.PUBLIC_GOOGLE_API_KEY || '',
    clientId: env.PUBLIC_GOOGLE_CLIENT_ID || '',
    clientSecret: env.PUBLIC_GOOGLE_CLIENT_SECRET || '',
    hasApiKey: !!(env.PUBLIC_GOOGLE_API_KEY),
    hasClientId: !!(env.PUBLIC_GOOGLE_CLIENT_ID),
    hasClientSecret: !!(env.PUBLIC_GOOGLE_CLIENT_SECRET),
    isValid: !!(env.PUBLIC_GOOGLE_API_KEY && env.PUBLIC_GOOGLE_CLIENT_ID && env.PUBLIC_GOOGLE_CLIENT_SECRET)
  };
};

/**
 * Get ThingsBoard credentials from runtime environment
 */
export const getThingsBoardCredentials = () => {
  if (typeof window === 'undefined') return null;
  
  const env = window.RUNTIME_ENV || {};
  return {
    publicUrl: env.PUBLIC_THINGSBOARD_URL || 'https://tb.pkc.pub',
    serverUrl: env.THINGSBOARD_URL || 'https://tb.pkc.pub',
    username: env.THINGSBOARD_USERNAME || '',
    password: env.THINGSBOARD_PASSWORD || '',
    dashboardUrl: env.PUBLIC_THINGSBOARD_DASHBOARD_URL || '',
    hasUrl: !!(env.PUBLIC_THINGSBOARD_URL),
    hasCredentials: !!(env.THINGSBOARD_USERNAME && env.THINGSBOARD_PASSWORD),
    hasDashboardUrl: !!(env.PUBLIC_THINGSBOARD_DASHBOARD_URL),
    isValid: !!(env.PUBLIC_THINGSBOARD_URL && env.THINGSBOARD_USERNAME && env.THINGSBOARD_PASSWORD)
  };
};
