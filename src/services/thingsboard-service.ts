import { getThingsBoardCredentials } from '../utils/runtime-env';

export type TBDevice = {
  id?: { id: string; entityType?: string } | string;
  name: string;
  type?: string;
  label?: string;
};

export type TBTelemetry = Record<string, Array<{ ts: number; value: string | number | boolean }>>;

// Dynamic credentials from runtime environment
let THINGSBOARD_URL = '';
let THINGSBOARD_USERNAME = '';
let THINGSBOARD_PASSWORD = '';
let PUBLIC_THINGSBOARD_URL = '';
let PUBLIC_THINGSBOARD_DASHBOARD_URL = '';

// Function to fetch credentials from runtime environment
const fetchRuntimeCredentials = async () => {
  try {
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
      const env = await response.json();
      PUBLIC_THINGSBOARD_URL = env.PUBLIC_THINGSBOARD_URL || 'https://tb.pkc.pub';
      THINGSBOARD_URL = env.THINGSBOARD_URL || 'https://tb.pkc.pub';
      THINGSBOARD_USERNAME = env.THINGSBOARD_USERNAME || '';
      THINGSBOARD_PASSWORD = env.THINGSBOARD_PASSWORD || '';
      PUBLIC_THINGSBOARD_DASHBOARD_URL = env.PUBLIC_THINGSBOARD_DASHBOARD_URL || '';
      
      console.log('🔑 ThingsBoard credentials updated from runtime environment:', {
        hasUrl: !!PUBLIC_THINGSBOARD_URL,
        hasCredentials: !!(THINGSBOARD_USERNAME && THINGSBOARD_PASSWORD),
        hasDashboardUrl: !!PUBLIC_THINGSBOARD_DASHBOARD_URL,
        timestamp: new Date().toISOString()
      });
      
      return { PUBLIC_THINGSBOARD_URL, THINGSBOARD_URL, THINGSBOARD_USERNAME, THINGSBOARD_PASSWORD, PUBLIC_THINGSBOARD_DASHBOARD_URL };
    } else {
      throw new Error(`Failed to fetch runtime environment: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Error fetching ThingsBoard credentials from runtime environment:', error);
    // Fallback to import.meta.env if runtime fetch fails
    PUBLIC_THINGSBOARD_URL = (import.meta as any).env?.PUBLIC_THINGSBOARD_URL || 'https://tb.pkc.pub';
    THINGSBOARD_URL = (import.meta as any).env?.THINGSBOARD_URL || 'https://tb.pkc.pub';
    THINGSBOARD_USERNAME = (import.meta as any).env?.THINGSBOARD_USERNAME || '';
    THINGSBOARD_PASSWORD = (import.meta as any).env?.THINGSBOARD_PASSWORD || '';
    PUBLIC_THINGSBOARD_DASHBOARD_URL = (import.meta as any).env?.PUBLIC_THINGSBOARD_DASHBOARD_URL || '';
    
    console.log('⚠️ Using fallback ThingsBoard credentials from import.meta.env');
    return { PUBLIC_THINGSBOARD_URL, THINGSBOARD_URL, THINGSBOARD_USERNAME, THINGSBOARD_PASSWORD, PUBLIC_THINGSBOARD_DASHBOARD_URL };
  }
};

function getTBBaseUrl(): string {
  // Prefer runtime-injected env (client) then dynamic credentials, fallback to localhost
  if (typeof window !== 'undefined' && (window as any).RUNTIME_ENV?.PUBLIC_THINGSBOARD_URL) {
    return (window as any).RUNTIME_ENV.PUBLIC_THINGSBOARD_URL;
  }
  if (PUBLIC_THINGSBOARD_URL) {
    return PUBLIC_THINGSBOARD_URL;
  }
  // @ts-ignore - Astro exposes PUBLIC_ vars via import.meta.env
  return (import.meta as any).env?.PUBLIC_THINGSBOARD_URL || 'https://tb.pkc.pub';
}

function toWsUrl(httpUrl: string): string {
  if (httpUrl.startsWith('https://')) return 'wss://' + httpUrl.slice('https://'.length);
  if (httpUrl.startsWith('http://')) return 'ws://' + httpUrl.slice('http://'.length);
  return httpUrl.replace(/^http/, 'ws');
}

// Initialize credentials on module load
let credentialsLoaded = false;

// Function to refresh credentials
const refreshCredentials = async () => {
  try {
    await fetchRuntimeCredentials();
    credentialsLoaded = true;
    
    // Dispatch event to notify components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('thingsboard-credentials-updated', {
        detail: {
          hasUrl: !!PUBLIC_THINGSBOARD_URL,
          hasCredentials: !!(THINGSBOARD_USERNAME && THINGSBOARD_PASSWORD),
          hasDashboardUrl: !!PUBLIC_THINGSBOARD_DASHBOARD_URL,
          timestamp: new Date().toISOString()
        }
      }));
    }
  } catch (error) {
    console.error('❌ Failed to refresh ThingsBoard credentials:', error);
  }
};

// Set up automatic credential refresh when runtime environment changes
if (typeof window !== 'undefined') {
  // Listen for runtime environment changes
  window.addEventListener('runtime-env-changed', async (event) => {
    console.log('🔄 Runtime environment changed, checking ThingsBoard credentials...');
    try {
      await refreshCredentials();
    } catch (error) {
      console.error('❌ Failed to refresh credentials after environment change:', error);
    }
  });
}

// Function to validate credentials
const validateCredentials = () => {
  const hasUrl = !!(PUBLIC_THINGSBOARD_URL);
  const hasCredentials = !!(THINGSBOARD_USERNAME && THINGSBOARD_PASSWORD);
  
  return {
    isValid: hasUrl && hasCredentials,
    hasUrl,
    hasCredentials,
    errors: [
      ...(!hasUrl ? ['ThingsBoard URL is missing'] : []),
      ...(!hasCredentials ? ['ThingsBoard username or password is missing'] : [])
    ]
  };
};

// Export validation and credential functions for external use
export const hasValidThingsBoardCredentials = () => validateCredentials().isValid;
export const getThingsBoardCredentialsError = () => {
  const validation = validateCredentials();
  return validation.isValid ? null : validation.errors.join(', ');
};

/**
 * ThingsBoardService wraps minimal REST and WebSocket operations.
 * For secure deployments, prefer calling the optional proxy route: /api/proxy/thingsboard
 */
export class ThingsBoardService {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = (baseUrl || getTBBaseUrl()).replace(/\/$/, '');
    
    // Initialize credentials if not already loaded
    if (!credentialsLoaded) {
      refreshCredentials();
    }
  }

  /**
   * List devices (tenant scope). This typically requires authentication.
   * If you enable the proxy route, this will hit the proxy instead of TB directly to avoid CORS/auth issues.
   */
  async listDevices(options: { page?: number; pageSize?: number; useProxy?: boolean } = {}): Promise<TBDevice[]> {
    const { page = 0, pageSize = 20, useProxy = true } = options;
    const path = `/api/tenant/devices?pageSize=${pageSize}&page=${page}`;

    const url = useProxy
      ? `/api/proxy/thingsboard?path=${encodeURIComponent('/api/tenant/devices')}&pageSize=${pageSize}&page=${page}`
      : `${this.baseUrl}${path}`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to list devices: ${res.status} ${res.statusText}`);
    }
    // TB returns { data: Device[], totalPages, totalElements, hasNext }
    const json = await res.json();
    if (Array.isArray(json)) return json as TBDevice[]; // in case of different TB versions
    return (json?.data as TBDevice[]) || [];
  }

  /**
   * Get latest telemetry values for a device by ID, keys is comma-separated list of telemetry keys.
   */
  async getLatestTelemetry(deviceId: string, keys: string, options: { useProxy?: boolean } = {}): Promise<TBTelemetry> {
    const { useProxy = true } = options;
    const path = `/api/plugins/telemetry/DEVICE/${deviceId}/values/timeseries?keys=${encodeURIComponent(keys)}&useStrictDataTypes=true`;

    const url = useProxy
      ? `/api/proxy/thingsboard?path=${encodeURIComponent(`/api/plugins/telemetry/DEVICE/${deviceId}/values/timeseries`)}&keys=${encodeURIComponent(keys)}&useStrictDataTypes=true`
      : `${this.baseUrl}${path}`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to get telemetry: ${res.status} ${res.statusText}`);
    }
    return (await res.json()) as TBTelemetry;
  }

  /**
   * Get available timeseries keys for a device. Useful to build a selectable list of telemetry.
   */
  async getTimeseriesKeys(deviceId: string, options: { useProxy?: boolean } = {}): Promise<string[]> {
    const { useProxy = true } = options;
    const path = `/api/plugins/telemetry/DEVICE/${deviceId}/keys/timeseries`;

    const url = useProxy
      ? `/api/proxy/thingsboard?path=${encodeURIComponent(path)}`
      : `${this.baseUrl}${path}`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to get telemetry keys: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    // TB returns an array of strings
    return Array.isArray(data) ? (data as string[]) : [];
  }

  /**
   * Subscribe to live telemetry updates via WebSocket.
   * Requires an access token (tenant/device JWT) unless TB is configured for anonymous WS.
   * onMessage receives raw parsed message from TB WS API.
   */
  subscribeTelemetry(params: {
    token: string; // Bearer token (JWT) or device token; if not needed, pass empty string
    entityType: 'DEVICE';
    entityId: string; // UUID
    keys: string; // comma-separated
    onMessage: (data: any) => void;
    onError?: (err: any) => void;
  }): () => void {
    const { token, entityType, entityId, keys, onMessage, onError } = params;
    const wsBase = toWsUrl(this.baseUrl);
    const wsUrl = `${wsBase}/api/ws/plugins/telemetry?token=${encodeURIComponent(token || '')}`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      const cmd = {
        tsSubCmds: [
          {
            entityType,
            entityId,
            scope: 'LATEST_TELEMETRY',
            keys,
            cmdId: 1,
          },
        ],
        historyCmds: [],
        attrSubCmds: [],
      };
      ws.send(JSON.stringify(cmd));
    };

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        onMessage(data);
      } catch (e) {
        onError?.(e);
      }
    };

    ws.onerror = (err) => onError?.(err);

    return () => {
      try { ws.close(); } catch {}
    };
  }
}

export const thingsBoardService = new ThingsBoardService();
