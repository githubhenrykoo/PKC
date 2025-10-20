// src/server/mcard.ts
// MCard server-side client with auth, retries, and helpers

import crypto from 'node:crypto';

const API_URL = process.env.MCARD_API_URL || process.env.PUBLIC_MCARD_API_URL || '';
const API_TOKEN = process.env.MCARD_API_TOKEN || '';

if (!API_URL) {
  console.warn('[MCard] MCARD_API_URL not set. Set MCARD_API_URL in .env');
}

export type MCardStoreResult = {
  hash: string;
  content_type?: string;
  g_time?: string;
};

export type MCardFileResult = {
  hash: string;
  filename?: string;
  content_type?: string;
  size_bytes?: number;
  g_time?: string;
};

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (API_TOKEN) headers['Authorization'] = `Bearer ${API_TOKEN}`;
  return headers;
}

async function fetchWithRetry(url: string, init: RequestInit, retries = 3, baseDelayMs = 300): Promise<Response> {
  let attempt = 0;
  let lastErr: any;
  while (attempt <= retries) {
    try {
      const res = await fetch(url, init);
      if (res.ok) return res;
      // Retry only for 5xx
      if (res.status >= 500) throw new Error(`MCard ${res.status} ${res.statusText}`);
      return res; // non-5xx returns as-is
    } catch (err) {
      lastErr = err;
      if (attempt === retries) break;
      const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 100;
      await new Promise((r) => setTimeout(r, delay));
      attempt++;
    }
  }
  throw lastErr;
}

export async function storeCardJSON(obj: unknown): Promise<MCardStoreResult> {
  if (!API_URL) throw new Error('MCARD_API_URL not configured');
  const fd = new FormData();
  const blob = new Blob([JSON.stringify(obj)], { type: 'application/json' });
  fd.append('content', blob, 'content.json');
  const res = await fetchWithRetry(`${API_URL}/card`, {
    method: 'POST',
    headers: authHeaders(),
    body: fd
  });
  if (!res.ok) throw new Error(`MCard storeCardJSON error ${res.status}`);
  return res.json();
}

export async function uploadJSONL(lines: string[], metadata?: Record<string, any>): Promise<MCardFileResult> {
  if (!API_URL) throw new Error('MCARD_API_URL not configured');
  const fd = new FormData();
  const content = lines.join('\n');
  const blob = new Blob([content], { type: 'application/x-ndjson' });
  fd.append('file', blob, 'telemetry.jsonl');
  if (metadata) fd.append('metadata', JSON.stringify(metadata));
  const res = await fetchWithRetry(`${API_URL}/files`, {
    method: 'POST',
    headers: authHeaders(),
    body: fd
  });
  if (!res.ok) throw new Error(`MCard uploadJSONL error ${res.status}`);
  return res.json();
}

export function digestKey(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}
