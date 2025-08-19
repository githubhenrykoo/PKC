import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { fetchMCards } from '../../store/slices/data-slice';
import type { AppDispatch } from '../../store';

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

        console.log('📡 Runtime environment loaded, fetching MCard data...');
        
        // Fetch initial MCard data
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

// Declare global window.RUNTIME_ENV type for TypeScript
declare global {
  interface Window {
    RUNTIME_ENV?: Record<string, string>;
  }
}
