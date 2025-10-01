export type TBDevice = {
  id?: { id: string; entityType?: string } | string;
  name: string;
  type?: string;
  label?: string;
};

export type TBTelemetry = Record<string, Array<{ ts: number; value: string | number | boolean }>>;

function getTBBaseUrl(): string {
  // Prefer runtime-injected env (client) then Vite/Astro import.meta.env, fallback to localhost
  if (typeof window !== 'undefined' && (window as any).RUNTIME_ENV?.PUBLIC_THINGSBOARD_URL) {
    return (window as any).RUNTIME_ENV.PUBLIC_THINGSBOARD_URL;
  }
  // @ts-ignore - Astro exposes PUBLIC_ vars via import.meta.env
  return (import.meta as any).env?.PUBLIC_THINGSBOARD_URL || 'http://localhost:8080';
}

function toWsUrl(httpUrl: string): string {
  if (httpUrl.startsWith('https://')) return 'wss://' + httpUrl.slice('https://'.length);
  if (httpUrl.startsWith('http://')) return 'ws://' + httpUrl.slice('http://'.length);
  return httpUrl.replace(/^http/, 'ws');
}

/**
 * ThingsBoardService wraps minimal REST and WebSocket operations.
 * For secure deployments, prefer calling the optional proxy route: /api/proxy/thingsboard
 */
export class ThingsBoardService {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = (baseUrl || getTBBaseUrl()).replace(/\/$/, '');
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
