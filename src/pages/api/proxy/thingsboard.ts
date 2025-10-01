import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

// Server-side base URL (do NOT prefix with PUBLIC_)
// Load .env explicitly to guarantee server-side vars are available in dev
const ROOT_DIR = process.cwd();
dotenv.config({ path: path.join(ROOT_DIR, '.env') });

let TB_BASE = (process.env.THINGSBOARD_URL || 'http://localhost:8080').replace(/\/$/, '');
let TB_USER = process.env.THINGSBOARD_USERNAME || '';
let TB_PASS = process.env.THINGSBOARD_PASSWORD || '';

function loadEnvFallback() {
  try {
    const envPath = path.join(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) return;
    const text = fs.readFileSync(envPath, 'utf8');
    const map: Record<string, string> = {};
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      map[key] = val;
    }
    if (!process.env.THINGSBOARD_URL && map.THINGSBOARD_URL) {
      process.env.THINGSBOARD_URL = map.THINGSBOARD_URL;
    }
    if (!process.env.THINGSBOARD_USERNAME && map.THINGSBOARD_USERNAME) {
      process.env.THINGSBOARD_USERNAME = map.THINGSBOARD_USERNAME;
    }
    if (!process.env.THINGSBOARD_PASSWORD && map.THINGSBOARD_PASSWORD) {
      process.env.THINGSBOARD_PASSWORD = map.THINGSBOARD_PASSWORD;
    }
    if (!process.env.THINGSBOARD_TOKEN && map.THINGSBOARD_TOKEN) {
      process.env.THINGSBOARD_TOKEN = map.THINGSBOARD_TOKEN;
    }
    // refresh local copies
    TB_BASE = (process.env.THINGSBOARD_URL || TB_BASE).replace(/\/$/, '');
    TB_USER = process.env.THINGSBOARD_USERNAME || TB_USER;
    TB_PASS = process.env.THINGSBOARD_PASSWORD || TB_PASS;
  } catch {
    // ignore
  }
}

// attempt fallback load at module init
if (!TB_USER || !TB_PASS) {
  loadEnvFallback();
}

// In-memory token cache (server process lifetime)
let cachedToken: string | null = process.env.THINGSBOARD_TOKEN || null;

async function loginIfNeeded(): Promise<string | null> {
  // If token already set via env or previously cached, reuse it
  if (cachedToken && cachedToken.trim().length > 0) return cachedToken;
  if (!TB_USER || !TB_PASS) return null;
  try {
    const res = await fetch(`${TB_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ username: TB_USER, password: TB_PASS }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    cachedToken = json?.token || null;
    return cachedToken;
  } catch {
    return null;
  }
}

function buildTargetUrl(reqUrl: URL): string {
  const path = reqUrl.searchParams.get('path') || '/api/tenant/devices';
  const sp = new URLSearchParams(reqUrl.searchParams);
  // remove the internal 'path' param before forwarding
  sp.delete('path');
  const qs = sp.toString();
  return `${TB_BASE}${path}${qs ? `?${qs}` : ''}`;
}

async function forward(request: Request, targetUrl: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  // Acquire token (env or auto-login)
  let token = process.env.THINGSBOARD_TOKEN || cachedToken || null;
  if (!token) {
    token = await loginIfNeeded();
  }
  if (token && token.trim().length > 0) {
    const bearer = `Bearer ${token}`;
    headers['X-Authorization'] = bearer;     // primary header per TB docs
    headers['Authorization'] = bearer;       // compatibility with some setups
  }

  // For GET proxy in this minimal example; extend to POST/PUT/DELETE as needed
  let res = await fetch(targetUrl, {
    method: 'GET',
    headers,
  });

  // If unauthorized and we have creds, try re-login once and retry
  if (res.status === 401 && TB_USER && TB_PASS) {
    cachedToken = null; // clear cache
    const newToken = await loginIfNeeded();
    if (newToken) {
      const bearer = `Bearer ${newToken}`;
      headers['X-Authorization'] = bearer;
      headers['Authorization'] = bearer;
      res = await fetch(targetUrl, { method: 'GET', headers });
    }
  }

  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: {
      'Content-Type': res.headers.get('content-type') || 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

export const GET: APIRoute = async ({ request }) => {
  try {
    const reqUrl = new URL(request.url);
    const target = buildTargetUrl(reqUrl);
    // Debug mode: show token presence and target URL
    if (reqUrl.searchParams.get('debug') === '1') {
      const envToken = process.env.THINGSBOARD_TOKEN;
      const hasToken = Boolean((envToken && envToken.trim().length > 0) || (cachedToken && cachedToken.trim().length > 0));
      const hasCreds = Boolean(TB_USER && TB_PASS);
      return new Response(JSON.stringify({ ok: true, hasToken, hasCreds, target }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      });
    }
    return await forward(request, target);
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Proxy error', details: e?.message || String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async () => new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
