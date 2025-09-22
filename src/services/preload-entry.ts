import { preloadService } from './preload-service';

// Kick off basic connectivity check and optional preload on DOM ready
window.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log('🧪 Testing MCard API connection...');
    const apiUrl = (window as any).RUNTIME_ENV?.PUBLIC_MCARD_API_URL || 'http://localhost:49384/v1';

    const res = await fetch(`${apiUrl}/health`);
    console.log('🏥 API Health check:', res.status, res.statusText);
    if (res.ok) {
      const json = await res.json().catch(() => null);
      console.log('📡 Health payload:', json);
    }
  } catch (err) {
    console.error('❌ MCard API health check failed:', err);
  }

  try {
    // Non-blocking preload (safe to no-op if service guards are in place)
    await preloadService.preloadAllMCards(false);
    console.log('🚀 Preload complete');
  } catch (err) {
    console.warn('⚠️ Preload skipped or failed:', err);
  }
});
