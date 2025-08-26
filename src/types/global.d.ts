// Export the RuntimeEnv interface for use in other files
export interface RuntimeEnv {
  // Core configuration
  PUBLIC_API_URL: string;
  
  // Authentication
  PUBLIC_AUTH_URL: string;
  PUBLIC_AUTHENTIK_URL: string;
  PUBLIC_AUTHENTIK_CLIENT_ID: string;
  PUBLIC_AUTHENTIK_CLIENT_SECRET: string;
  PUBLIC_AUTHENTIK_REDIRECT_URI: string;
  
  // MCard API
  PUBLIC_MCARD_API_URL: string;
  
  // Feature flags (stored as strings)
  ENABLE_EXPERIMENTAL_FEATURES: string;
  
  // Version info
  VERSION: string;
  BUILD_TIMESTAMP: string;
  
  // Allow any other string keys with string values
  [key: string]: string | undefined;
}

// Global augmentations
declare global {
  // PWA-related events and helpers
  interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
      outcome: 'accepted' | 'dismissed';
      platform: string;
    }>;
    prompt(): Promise<void>;
  }

  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
    appinstalled: Event;
    'runtime-env-loaded': Event;
  }

  interface Window {
    // PWA installation
    deferredPrompt?: BeforeInstallPromptEvent;

    // Runtime environment variables
    RUNTIME_ENV: RuntimeEnv;

    // Helper function to get environment variables
    getEnv?: <T extends string | number | boolean>(key: string, defaultValue: T) => T;
  }
}
