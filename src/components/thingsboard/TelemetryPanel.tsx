import React, { useEffect, useMemo, useState } from 'react';
import { thingsBoardService, type TBDevice, type TBTelemetry } from '../../services/thingsboard-service';

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
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
  }, [pageSize]);

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
                const normalized = Array.isArray(list) ? list : [];
                base[k] = normalized;
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

  const deviceOptions = useMemo(() => {
    return devices.map((d) => ({
      id: typeof d.id === 'string' ? d.id : (d.id?.id || ''),
      name: d.name,
    }));
  }, [devices]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">Device:</label>
        <select
          className="border rounded px-2 py-1"
          onChange={(e) => setSelectedId(e.target.value || null)}
          value={selectedId || ''}
        >
          <option value="">Select device...</option>
          {deviceOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>{opt.name}</option>
          ))}
        </select>
        <div className={`text-xs px-2 py-0.5 rounded ${wsActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
          {wsActive ? 'WS: Live' : 'WS: Offline'}
        </div>
        <button
          className="text-xs border rounded px-2 py-1 hover:bg-gray-50"
          onClick={() => setWsNonce((n) => n + 1)}
          disabled={!selectedId}
          title="Reconnect WebSocket"
        >
          Reconnect
        </button>
        {loading && <span className="text-xs opacity-70">Loading devices...</span>}
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>

      {selectedId && (
        <div className="border rounded p-4">
          <h3 className="font-semibold mb-2">Select Telemetry Keys</h3>
          {availableKeys.length === 0 && (
            <div className="text-sm opacity-70">No telemetry keys found for this device.</div>
          )}
          {availableKeys.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {availableKeys.map((k) => {
                const checked = selectedKeys.includes(k);
                return (
                  <label key={k} className="flex items-center gap-2 text-sm border rounded px-2 py-1">
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

      <div className="border rounded p-4">
        <h3 className="font-semibold mb-2">Latest Telemetry</h3>
        {!selectedId && <div className="text-sm opacity-70">Select a device to view telemetry.</div>}
        {selectedId && !latest && <div className="text-sm opacity-70">No data.</div>}
        {selectedId && latest && (
          <div className="text-sm overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-1 px-2">Key</th>
                  <th className="py-1 px-2">Value</th>
                  <th className="py-1 px-2">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(latest)
                  .filter(([key]) => selectedKeys.length === 0 || selectedKeys.includes(key))
                  .map(([key, arr]) => {
                    const last = arr?.[arr.length - 1];
                    const ts = last ? new Date(last.ts).toLocaleString() : '-';
                    const val = last ? String(last.value) : '-';
                    return (
                      <tr key={key} className="border-b">
                        <td className="py-1 px-2 font-mono">{key}</td>
                        <td className="py-1 px-2">{val}</td>
                        <td className="py-1 px-2 opacity-60">{ts}</td>
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
