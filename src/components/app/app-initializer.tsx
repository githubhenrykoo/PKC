import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { fetchMCards } from '../../store/slices/data-slice';
import type { AppDispatch } from '../../store';
import { resolveMCardBaseUrl } from '@/services/service-resolver';

interface AppInitializerProps {
  children?: React.ReactNode;
}

/**
 * AppInitializer - Handles app startup initialization
 * Fetches MCard data and populates Redux store on app startup
 */
export function AppInitializer({ children }: AppInitializerProps) {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    let mounted = true;

    const initializeApp = async () => {
      try {
        console.log('🚀 Initializing PKC app...');
        
        // Wait for runtime environment to be loaded
        const waitForRuntimeEnv = () => {
          return new Promise<void>((resolve) => {
            if (window.RUNTIME_ENV) {
              resolve();
            } else {
              const handler = () => {
                window.removeEventListener('runtime-env-loaded', handler);
                resolve();
              };
              window.addEventListener('runtime-env-loaded', handler);
            }
          });
        };

        await waitForRuntimeEnv();
        
        if (!mounted) return;

        console.log('📡 Runtime environment loaded, resolving MCard service...');

        // Probe service availability (localhost-first in dev) with 1500ms timeout
        const resolvedUrl = await resolveMCardBaseUrl(1500);

        if (!mounted) return;

        if (resolvedUrl) {
          const currentUrl = window.RUNTIME_ENV?.PUBLIC_MCARD_API_URL;
          if (currentUrl !== resolvedUrl) {
            console.log('🔄 Updating PUBLIC_MCARD_API_URL ->', resolvedUrl);
            window.RUNTIME_ENV = { ...(window.RUNTIME_ENV || {}), PUBLIC_MCARD_API_URL: resolvedUrl } as any;
            window.dispatchEvent(new Event('runtime-env-loaded'));
          }

          console.log('📥 Fetching initial MCard data from', resolvedUrl);
          const result = await dispatch(fetchMCards({ 
            page: 1, 
            pageSize: 50, // Get more items for navigation
            sortBy: 'g_time',
            sortOrder: 'desc'
          }));

          if (fetchMCards.fulfilled.match(result)) {
            console.log('✅ MCard data loaded successfully:', result.payload.items.length, 'items');
          } else if (fetchMCards.rejected.match(result)) {
            console.error('❌ Failed to load MCard data:', result.payload);
          }
        } else {
          console.warn('⚠️ MCard service not reachable (localhost and runtime env). Running without initial data.');
        }

      } catch (error) {
        console.error('❌ App initialization failed:', error);
      }
    };

    initializeApp();

    return () => {
      mounted = false;
    };
  }, [dispatch]);

  return <>{children}</>;
}

