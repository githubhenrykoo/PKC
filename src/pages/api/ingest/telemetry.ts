// src/pages/api/ingest/telemetry.ts
// ThingsBoard Webhook endpoint to persist telemetry into MCard without needing the UI open
// Accepts single message or batch array.

import type { APIRoute } from 'astro';
import { storeCardJSON, uploadJSONL, digestKey } from '@/server/mcard';

const WEBHOOK_SECRET = process.env.TB_WEBHOOK_SECRET || '';

function unauthorized(msg = 'unauthorized') {
  return new Response(JSON.stringify({ ok: false, error: msg }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' }
  });
}

function badRequest(msg: string) {
  return new Response(JSON.stringify({ ok: false, error: msg }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Normalize TB payload into canonical schema
function normalize(msg: any) {
  const now = new Date().toISOString();
  return {
    source: 'thingsboard',
    device_id: msg.device_id || msg.originatorId || msg.deviceId || null,
    device_name: msg.device_name || msg.originatorName || msg.deviceName || null,
    tenant: msg.tenant || msg.tenantId || null,
    ts: typeof msg.ts === 'number' ? msg.ts : (msg.ts && Date.parse(msg.ts)) || Date.now(),
    kv: msg.kv || msg.msg || msg.data || {},
    meta: msg.additionalInfo || msg.meta || {},
    ingest_time: now,
    schema_version: 1
  };
}

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  // Auth: require shared secret via Authorization: Bearer <secret>
  if (WEBHOOK_SECRET) {
    const auth = request.headers.get('authorization') || '';
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m || m[1] !== WEBHOOK_SECRET) {
      return unauthorized('invalid secret');
    }
  }

  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return badRequest('invalid json');
  }

  // Support batch
  const items: any[] = Array.isArray(payload) ? payload : [payload];
  if (items.length === 0) return badRequest('empty payload');

  // Decide: per-event store or batch JSONL when large
  // If > 50 messages, batch as JSONL for efficiency
  if (items.length > 50) {
    const normalized = items.map(normalize);
    // Build JSONL lines and include idempotency key in metadata
    const lines = normalized.map((n) => JSON.stringify(n));
    const first = normalized[0];
    const last = normalized[normalized.length - 1];
    const keys = Array.from(
      normalized.reduce<Set<string>>((s, n) => {
        Object.keys(n.kv || {}).forEach((k) => s.add(k));
        return s;
      }, new Set()).values()
    );
    const meta = {
      source: 'thingsboard',
      device_id: first.device_id || null,
      device_name: first.device_name || null,
      start_ts: first.ts,
      end_ts: last.ts,
      count: normalized.length,
      keys
    };
    try {
      const res = await uploadJSONL(lines, meta);
      return new Response(JSON.stringify({ ok: true, mode: 'batch', hash: res.hash }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ ok: false, error: err?.message || String(err) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // Per-message storage with idempotency guard
  const results: { hash: string; key: string }[] = [];
  for (const msg of items) {
    const n = normalize(msg);
    const idemKey = digestKey(`${n.device_id}|${n.ts}|${JSON.stringify(n.kv)}`);
    try {
      const res = await storeCardJSON({ ...n, idem_key: idemKey });
      results.push({ hash: res.hash, key: idemKey });
    } catch (err: any) {
      return new Response(JSON.stringify({ ok: false, error: err?.message || String(err) }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response(JSON.stringify({ ok: true, mode: 'single', results }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
