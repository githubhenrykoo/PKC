import { mcardService } from './mcard-service';
import { indexedDBService } from './indexeddb-service';
import { setPreloadComplete } from '../store/preload-state';
import type { MCard } from '../store/types/data';

const PRELOAD_INTERVAL = 15 * 60 * 1000; // 15 minutes

class PreloadService {

  async preloadAllMCards(force: boolean = false): Promise<void> {
    try {
      console.log('🚀 Starting MCard preload...');
      console.log('🔧 MCard API URL:', window.RUNTIME_ENV?.PUBLIC_MCARD_API_URL || 'fallback');
      
      const lastPreload = await indexedDBService.getPreference('lastMCardPreload', 0);
      const now = Date.now();

      if (!force && (now - lastPreload < PRELOAD_INTERVAL)) {
        console.log('🔄 MCard preload skipped, last preload was recent.');
        return;
      }

      let allMCards: MCard[] = [];
      let page = 1;
      let hasNextPage = true;

      while (hasNextPage) {
        console.log(`📡 Fetching MCards page ${page}...`);
        try {
          const response = await mcardService.fetchMCards({ page, pageSize: 100 });
          console.log(`📦 Page ${page} response:`, response);
          
          if (response.items.length > 0) {
            allMCards.push(...response.items);
            console.log(`✅ Added ${response.items.length} items from page ${page}`);
          }
          hasNextPage = response.pagination.hasNextPage;
          page++;
        } catch (pageError) {
          console.error(`❌ Error fetching page ${page}:`, pageError);
          break;
        }
      }

      console.log(`📊 Total MCards collected: ${allMCards.length}`);

      if (allMCards.length > 0) {
        console.log('💾 Bulk caching MCards...');
        await indexedDBService.bulkCacheMCards(allMCards);
        await indexedDBService.setPreference('lastMCardPreload', now);
        console.log(`✅ Successfully preloaded and cached ${allMCards.length} MCard metadata records.`);
      } else {
        console.log('ℹ️ No MCards found to preload.');
      }

    } catch (error) {
      console.error('❌ Failed to preload MCards:', error);
      if (error instanceof Error) {
        console.error('❌ Error details:', error.message);
        console.error('❌ Error stack:', error.stack);
      }
    } finally {
      setPreloadComplete();
    }
  }
}

export const preloadService = new PreloadService();
