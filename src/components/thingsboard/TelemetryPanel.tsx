import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { thingsBoardService, type TBDevice, type TBTelemetry, hasValidThingsBoardCredentials, getThingsBoardCredentialsError } from '../../services/thingsboard-service';
import { getThingsBoardCredentials } from '../../utils/runtime-env';

type Props = {
  pageSize?: number;
  telemetryKeys?: string; // comma-separated
};

export default function TelemetryPanel({ pageSize = 10, telemetryKeys = 'temperature,humidity' }: Props) {
  const [devices, setDevices] = useState<TBDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [latest, setLatest] = useState<TBTelemetry | null>(null);
  const [availableKeys, setAvailableKeys] = useState<string[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>(telemetryKeys.split(',').map((s) => s.trim()).filter(Boolean));
  const [wsActive, setWsActive] = useState<boolean>(false);
  const [wsNonce, setWsNonce] = useState<number>(0); // bump to force reconnect
  
  // Runtime environment state
  const [credentials, setCredentials] = useState<any>(null);
  const [credentialsLoaded, setCredentialsLoaded] = useState(false);
  const [credentialsError, setCredentialsError] = useState<string | null>(null);

  // Function to fetch runtime credentials
  const fetchRuntimeCredentials = useCallback(async () => {
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
        const tbCredentials = {
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
        
        setCredentials(tbCredentials);
        setCredentialsLoaded(true);
        setCredentialsError(tbCredentials.isValid ? null : 'ThingsBoard credentials are incomplete');
        
        console.log('🔑 ThingsBoard TelemetryPanel credentials updated:', {
          hasUrl: tbCredentials.hasUrl,
          hasCredentials: tbCredentials.hasCredentials,
          hasDashboardUrl: tbCredentials.hasDashboardUrl,
          isValid: tbCredentials.isValid,
          timestamp: new Date().toISOString()
        });
        
        return tbCredentials;
      } else {
        throw new Error(`Failed to fetch runtime environment: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error fetching ThingsBoard credentials from runtime environment:', error);
      setCredentialsError(`Failed to load credentials: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setCredentialsLoaded(true);
      return null;
    }
  }, []);

  // Initialize credentials on component mount
  useEffect(() => {
    fetchRuntimeCredentials();
  }, [fetchRuntimeCredentials]);

  // Listen for runtime environment changes
  useEffect(() => {
    const handleRuntimeEnvChange = async (event: any) => {
      console.log('🔄 Runtime environment changed, refreshing ThingsBoard credentials...');
      await fetchRuntimeCredentials();
    };

    const handleThingsBoardCredentialsUpdate = (event: any) => {
      console.log('🔄 ThingsBoard credentials updated:', event.detail);
      fetchRuntimeCredentials();
    };

    window.addEventListener('runtime-env-changed', handleRuntimeEnvChange);
    window.addEventListener('thingsboard-credentials-updated', handleThingsBoardCredentialsUpdate);

    return () => {
      window.removeEventListener('runtime-env-changed', handleRuntimeEnvChange);
      window.removeEventListener('thingsboard-credentials-updated', handleThingsBoardCredentialsUpdate);
    };
  }, [fetchRuntimeCredentials]);

  // Normalize a list of telemetry points into [{ts, value}]
  function normalizeSeries(arr: any): Array<{ ts: number; value: any }> {
    if (!Array.isArray(arr)) return [];
    return arr
      .map((e: any) => {
        if (Array.isArray(e) && e.length >= 2) {
          // TB WS often returns [[ts, value]]
          return { ts: Number(e[0]), value: e[1] };
        }
        if (e && typeof e === 'object') {
          const ts = 'ts' in e ? Number((e as any).ts) : NaN;
          const value = 'value' in e ? (e as any).value : undefined;
          if (!Number.isNaN(ts)) return { ts, value };
        }
        // fallback
        return { ts: Date.now(), value: e };
      })
      .filter((p) => typeof p.ts === 'number' && !Number.isNaN(p.ts));
  }

  useEffect(() => {
    // Don't load devices until credentials are loaded and valid
    if (!credentialsLoaded || !credentials?.isValid) {
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const list = await thingsBoardService.listDevices({ page: 0, pageSize, useProxy: true });
        if (!cancelled) setDevices(list);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pageSize, credentialsLoaded, credentials?.isValid]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;

    (async () => {
      // 1) Load available keys for this device
      try {
        const keys = await thingsBoardService.getTimeseriesKeys(selectedId, { useProxy: true });
        if (!cancelled) setAvailableKeys(keys);
        // Ensure selectedKeys stays valid (keep intersection or default to all if empty)
        if (!cancelled) {
          const intersect = selectedKeys.filter((k) => keys.includes(k));
          const next = intersect.length > 0 ? intersect : keys;
          setSelectedKeys(next);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || String(e));
      }

      // 2) Load latest telemetry for selected keys
      try {
        const keysCsv = (selectedKeys.length > 0 ? selectedKeys : availableKeys).join(',');
        const data = await thingsBoardService.getLatestTelemetry(selectedId, keysCsv, { useProxy: true });
        if (!cancelled) setLatest(data);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || String(e));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedId, telemetryKeys, selectedKeys.join(',' )]);

  // Realtime: subscribe to WS for selected keys
  useEffect(() => {
    if (!selectedId) return;
    if ((selectedKeys.length === 0 && availableKeys.length === 0)) return;

    let cleanup: (() => void) | null = null;
    let cancelled = false;

    (async () => {
      try {
        // get token from proxy (auto-login)
        const res = await fetch('/api/proxy/thingsboard?getToken=1');
        const j = await res.json();
        if (!j?.ok || !j?.token) {
          // token not available; keep UI without WS
          return;
        }

        const keysCsv = (selectedKeys.length > 0 ? selectedKeys : availableKeys).join(',');
        setWsActive(true);
        cleanup = thingsBoardService.subscribeTelemetry({
          token: j.token,
          entityType: 'DEVICE',
          entityId: selectedId,
          keys: keysCsv,
          onMessage: (data: any) => {
            // Merge incoming latest telemetry
            // Expected shape example: { data: { key: [{ ts, value }, ...] }, subscriptionId, ... }
            const incoming = (data && (data.data || data));
            if (!incoming) return;
            setLatest((prev) => {
              const base: any = { ...(prev || {}) };
              Object.entries(incoming as Record<string, any>).forEach(([k, arr]) => {
                const list = Array.isArray(arr) ? arr : (arr?.[k] || []);
                base[k] = normalizeSeries(list);
              });
              return base;
            });
          },
          onError: () => {
            setWsActive(false);
          },
        });
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
      try { cleanup && cleanup(); } catch {}
      setWsActive(false);
    };
  }, [selectedId, selectedKeys.join(','), availableKeys.join(','), wsNonce]);

  // Polling fallback every 5s when WS is offline
  useEffect(() => {
    if (!selectedId) return;
    const keysCsv = (selectedKeys.length > 0 ? selectedKeys : availableKeys).join(',');
    if (!keysCsv) return;
    if (wsActive) return; // only poll when offline

    let cancelled = false;
    const tick = async () => {
      try {
        const data = await thingsBoardService.getLatestTelemetry(selectedId, keysCsv, { useProxy: true });
        if (!cancelled) setLatest(data);
      } catch {
        // ignore polling errors
      }
    };
    // initial and interval
    tick();
    const id = setInterval(tick, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [selectedId, wsActive, selectedKeys.join(','), availableKeys.join(',')]);

  // Auto-retry WS every 10s while offline
  useEffect(() => {
    if (!selectedId) return;
    if (wsActive) return;
    const id = setInterval(() => setWsNonce((n) => n + 1), 10000);
    return () => clearInterval(id);
  }, [selectedId, wsActive, selectedKeys.join(','), availableKeys.join(',')]);

  const deviceOptions = useMemo(() => {
    return devices.map((d) => ({
      id: typeof d.id === 'string' ? d.id : (d.id?.id || ''),
      name: d.name,
    }));
  }, [devices]);

  return (
    <div className="space-y-6">
      {/* Credentials Status */}
      {!credentialsLoaded && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm text-blue-700">Loading ThingsBoard credentials...</span>
          </div>
        </div>
      )}
      
      {credentialsLoaded && credentialsError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-sm text-red-700 font-medium">ThingsBoard Configuration Error</span>
          </div>
          <p className="text-sm text-red-600 mt-1">{credentialsError}</p>
          <p className="text-xs text-red-500 mt-2">Please check your .env file configuration for ThingsBoard credentials.</p>
        </div>
      )}

      {credentialsLoaded && credentials?.isValid && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm text-green-700 font-medium">ThingsBoard Connected</span>
          </div>
          <p className="text-xs text-green-600 mt-1">URL: {credentials.publicUrl}</p>
        </div>
      )}

      <div className="flex items-center gap-3 bg-white border rounded-xl shadow-sm px-4 py-3">
        <label className="text-sm font-medium text-gray-700">Device</label>
        <select
          className="border rounded-md px-3 py-2 text-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onChange={(e) => setSelectedId(e.target.value || null)}
          value={selectedId || ''}
          disabled={!credentials?.isValid}
        >
          <option value="">
            {!credentials?.isValid ? 'Configure credentials first...' : 'Select device...'}
          </option>
          {deviceOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>{opt.name}</option>
          ))}
        </select>
        <div className={`text-xs px-2 py-0.5 rounded-md font-medium ${wsActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
          {wsActive ? 'WS: Live' : 'WS: Offline'}
        </div>
        <button
          className="text-xs border rounded-md px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => setWsNonce((n) => n + 1)}
          disabled={!selectedId || !credentials?.isValid}
          title="Reconnect WebSocket"
        >
          Reconnect
        </button>
        {loading && <span className="text-xs text-gray-500">Loading devices...</span>}
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>

      {selectedId && (
        <div className="bg-white border rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Select Telemetry Keys</h3>
            <span className="text-xs text-gray-500">{selectedKeys.length} selected</span>
          </div>
          {availableKeys.length === 0 && (
            <div className="text-sm text-gray-500">No telemetry keys found for this device.</div>
          )}
          {availableKeys.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {availableKeys.map((k) => {
                const checked = selectedKeys.includes(k);
                return (
                  <label
                    key={k}
                    className={`flex items-center gap-2 text-sm border rounded-full px-3 py-1 transition-colors cursor-pointer select-none ${
                      checked ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        setSelectedKeys((prev) =>
                          e.target.checked ? Array.from(new Set([...prev, k])) : prev.filter((x) => x !== k)
                        );
                      }}
                    />
                    <span className="font-mono">{k}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="bg-white border rounded-xl shadow-sm p-4">
        <h3 className="font-semibold mb-2">Latest Telemetry</h3>
        {!selectedId && <div className="text-sm text-gray-500">Select a device to view telemetry.</div>}
        {selectedId && !latest && <div className="text-sm text-gray-500">No data.</div>}
        {selectedId && latest && (
          <div className="text-sm overflow-x-auto">
            <table className="min-w-full text-sm border-separate border-spacing-0 table-fixed">
              <colgroup>
                <col className="w-2/5" />
                <col className="w-1/4" />
                <col className="w-1/3" />
              </colgroup>
              <thead className="sticky top-0 bg-white">
                <tr className="text-left border-b">
                  <th className="py-2 px-3 text-gray-600">Key</th>
                  <th className="py-2 px-3 text-gray-600 text-right">Value</th>
                  <th className="py-2 px-3 text-gray-600">Timestamp</th>
                </tr>
              </thead>
              <tbody className="[&>tr:nth-child(odd)]:bg-gray-50">
                {Object.entries(latest)
                  .filter(([key]) => selectedKeys.length === 0 || selectedKeys.includes(key))
                  .map(([key, arr]) => {
                    const series = Array.isArray(arr) ? arr : [];
                    const last: any = series.length > 0 ? series[series.length - 1] : null;
                    const tsNum = last && typeof last.ts !== 'undefined' ? Number(last.ts) : NaN;
                    const ts = !Number.isNaN(tsNum) ? new Date(tsNum).toLocaleString() : '-';
                    const val = typeof last?.value !== 'undefined' ? String(last.value) : '-';
                    return (
                      <tr key={key} className="border-b last:border-0">
                        <td className="py-2 px-3 font-mono text-gray-800 truncate">{key}</td>
                        <td className="py-2 px-3 font-mono tabular-nums text-right">{val}</td>
                        <td className="py-2 px-3 text-gray-500 whitespace-nowrap">{ts}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
