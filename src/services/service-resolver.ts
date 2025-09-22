// src/services/service-resolver.ts
import { fetchWithTimeout, trimBaseUrl } from '@/utils/net';

function isLocalHost(): boolean {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1';
}

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

/**
 * Resolve the best MCard API base URL to use at runtime.
 * - In dev/local host: prefer localhost, then runtime env URL.
 * - In prod: use runtime env URL.
 * Probes /health with a 1500ms timeout and no-store cache.
 */
export async function resolveMCardBaseUrl(timeoutMs = 1500): Promise<string | null> {
  const runtimeUrl = (typeof window !== 'undefined' ? window.RUNTIME_ENV?.PUBLIC_MCARD_API_URL : undefined) as string | undefined;
  const devOrLocal = (import.meta as any)?.env?.DEV === true || isLocalHost();

  const candidates = unique([
    ...(devOrLocal ? ['http://localhost:49384/v1'] : []),
    ...(runtimeUrl ? [runtimeUrl] : []),
  ]).map(trimBaseUrl);

  try { console.log('🧭 Service resolver candidates:', candidates); } catch {}

  for (const base of candidates) {
    try {
      const url = `${base}/health`;
      const res = await fetchWithTimeout(url, { headers: { 'Cache-Control': 'no-store' } }, timeoutMs);
      if (res.ok) {
        try { console.log('✅ MCard service reachable at', base); } catch {}
        return base;
      } else {
        try { console.warn('⚠️ Health check not ok for', base, res.status, res.statusText); } catch {}
      }
    } catch (e) {
      try { console.warn('⚠️ Health probe failed for', base, e); } catch {}
      // If localhost candidate in dev/local, retry once after short delay
      if (devOrLocal && base.startsWith('http://localhost:49384')) {
        try { console.log('⏳ Retrying localhost probe once after 250ms'); } catch {}
        await new Promise(r => setTimeout(r, 250));
        try {
          const retryRes = await fetchWithTimeout(`${base}/health`, { headers: { 'Cache-Control': 'no-store' } }, timeoutMs);
          if (retryRes.ok) {
            try { console.log('✅ Localhost reachable on retry at', base); } catch {}
            return base;
          }
          try { console.warn('⚠️ Localhost retry not ok for', base, retryRes.status, retryRes.statusText); } catch {}
        } catch (re) {
          try { console.warn('⚠️ Localhost retry failed for', base, re); } catch {}
        }
      }
      // ignore and try next
    }
  }
  try { console.error('❌ No reachable MCard service from candidates'); } catch {}
  return null;
}
