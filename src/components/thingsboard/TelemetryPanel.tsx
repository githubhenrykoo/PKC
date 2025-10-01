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
      try {
        const data = await thingsBoardService.getLatestTelemetry(selectedId, telemetryKeys, { useProxy: true });
        if (!cancelled) setLatest(data);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || String(e));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedId, telemetryKeys]);

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
        {loading && <span className="text-xs opacity-70">Loading devices...</span>}
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>

      <div className="border rounded p-4">
        <h3 className="font-semibold mb-2">Latest Telemetry</h3>
        {!selectedId && <div className="text-sm opacity-70">Select a device to view telemetry.</div>}
        {selectedId && !latest && <div className="text-sm opacity-70">No data.</div>}
        {selectedId && latest && (
          <div className="text-sm whitespace-pre-wrap">
            {Object.entries(latest).map(([key, arr]) => {
              const last = arr?.[arr.length - 1];
              const ts = last ? new Date(last.ts).toLocaleString() : '-';
              const val = last ? String(last.value) : '-';
              return (
                <div key={key} className="flex justify-between border-b py-1">
                  <span className="font-mono">{key}</span>
                  <span className="opacity-70">{val}</span>
                  <span className="opacity-50">{ts}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
