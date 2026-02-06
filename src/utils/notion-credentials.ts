// Notion credentials utility for runtime environment access

export interface NotionCredentials {
  CLIENT_ID: string;
  CLIENT_SECRET: string;
  AUTH_URL?: string;
  hasClientId: boolean;
  hasClientSecret: boolean;
  isValid: boolean;
}

export async function fetchRuntimeNotionCredentials(): Promise<NotionCredentials | null> {
  try {
    console.log('🔄 Fetching Notion credentials from runtime environment...');
    
    const response = await fetch('/runtime-env.json', {
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

    if (!response.ok) {
      console.error('Failed to fetch runtime environment');
      return null;
    }

    const env = await response.json();
    
    const credentials: NotionCredentials = {
      CLIENT_ID: env.PUBLIC_NOTION_CLIENT_ID || '',
      CLIENT_SECRET: env.PUBLIC_NOTION_CLIENT_SECRET || '',
      AUTH_URL: env.PUBLIC_NOTION_AUTH_URL || '',
      hasClientId: !!env.PUBLIC_NOTION_CLIENT_ID,
      hasClientSecret: !!env.PUBLIC_NOTION_CLIENT_SECRET,
      isValid: !!(env.PUBLIC_NOTION_CLIENT_ID && env.PUBLIC_NOTION_CLIENT_SECRET)
    };

    console.log('✅ Notion credentials loaded:', {
      hasClientId: credentials.hasClientId,
      hasClientSecret: credentials.hasClientSecret,
      hasAuthUrl: !!credentials.AUTH_URL,
      isValid: credentials.isValid
    });

    return credentials;
  } catch (error) {
    console.error('❌ Error fetching Notion credentials:', error);
    return null;
  }
}

export function getNotionCredentials(): NotionCredentials {
  // Fallback to build-time environment variables
  const credentials: NotionCredentials = {
    CLIENT_ID: import.meta.env.PUBLIC_NOTION_CLIENT_ID || '',
    CLIENT_SECRET: import.meta.env.PUBLIC_NOTION_CLIENT_SECRET || '',
    AUTH_URL: import.meta.env.PUBLIC_NOTION_AUTH_URL || '',
    hasClientId: !!import.meta.env.PUBLIC_NOTION_CLIENT_ID,
    hasClientSecret: !!import.meta.env.PUBLIC_NOTION_CLIENT_SECRET,
    isValid: !!(import.meta.env.PUBLIC_NOTION_CLIENT_ID && import.meta.env.PUBLIC_NOTION_CLIENT_SECRET)
  };

  return credentials;
}

export function validateNotionCredentials(credentials: NotionCredentials | null): boolean {
  if (!credentials) return false;
  return credentials.isValid && credentials.hasClientId && credentials.hasClientSecret;
}

export function getNotionCredentialErrorMessage(credentials: NotionCredentials | null): string {
  if (!credentials) {
    return 'Failed to load Notion credentials from environment';
  }
  
  if (!credentials.hasClientId) {
    return 'Missing PUBLIC_NOTION_CLIENT_ID in environment variables';
  }
  
  if (!credentials.hasClientSecret) {
    return 'Missing PUBLIC_NOTION_CLIENT_SECRET in environment variables';
  }
  
  return 'Notion credentials are valid';
}
