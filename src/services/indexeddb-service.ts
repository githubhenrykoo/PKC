import Dexie, { type Table } from 'dexie';
import type { MCard } from '../store/types/data';

// IndexedDB schema for MCard offline storage
export interface MCardCache {
  hash: string;           // Primary key - MCard hash
  content: string | Blob; // MCard content (text or binary)
  metadata: MCard;        // Full MCard metadata
  contentType: string;    // MIME type
  size: number;          // Content size in bytes
  timestamp: string;     // g_time from MCard
  cachedAt: number;      // Local cache timestamp
  lastAccessed: number;  // Last access time for LRU cleanup
  isOfflineAvailable: boolean; // Flag for offline availability
}

export interface SearchIndex {
  id?: number;           // Auto-increment primary key
  hash: string;          // MCard hash reference
  content: string;       // Searchable text content
  title: string;         // Document title
  contentType: string;   // MIME type
  tags: string[];        // Extracted tags/keywords
  lastIndexed: number;   // Indexing timestamp
}

export interface UserPreferences {
  key: string;           // Preference key
  value: any;           // Preference value
  updatedAt: number;    // Last update timestamp
}

// Dexie database class
export class PKCDatabase extends Dexie {
  // MCard cache table
  mcards!: Table<MCardCache, string>;
  
  // Search index table
  searchIndex!: Table<SearchIndex, number>;
  
  // User preferences table
  preferences!: Table<UserPreferences, string>;

  constructor() {
    super('PKCDatabase');
    
    // Database schema definition
    this.version(1).stores({
      mcards: 'hash, contentType, timestamp, cachedAt, lastAccessed, isOfflineAvailable',
      searchIndex: '++id, hash, contentType, title, lastIndexed',
      preferences: 'key, updatedAt'
    });

    // Hooks for automatic timestamp updates
    this.mcards.hook('creating', (primKey, obj, trans) => {
      (obj as MCardCache).cachedAt = Date.now();
      (obj as MCardCache).lastAccessed = Date.now();
    });

    this.mcards.hook('updating', (modifications, primKey, obj, trans) => {
      (modifications as Partial<MCardCache>).lastAccessed = Date.now();
    });

    this.preferences.hook('creating', (primKey, obj, trans) => {
      (obj as UserPreferences).updatedAt = Date.now();
    });

    this.preferences.hook('updating', (modifications, primKey, obj, trans) => {
      (modifications as Partial<UserPreferences>).updatedAt = Date.now();
    });
  }
}

// Singleton database instance
export const db = new PKCDatabase();

// IndexedDB Service class
export class IndexedDBService {
  private db: PKCDatabase;
  private maxCacheSize: number = 100 * 1024 * 1024; // 100MB cache limit
  private maxCacheItems: number = 1000; // Maximum cached items

  constructor() {
    this.db = db;
  }

  // Cache MCard content
  async cacheMCard(hash: string, content: string | Blob, metadata: MCard): Promise<void> {
    try {
      const size = typeof content === 'string' ? 
        new Blob([content]).size : 
        content.size;

      const cacheEntry: MCardCache = {
        hash,
        content,
        metadata,
        contentType: metadata.contentType,
        size,
        timestamp: metadata.timestamp,
        cachedAt: Date.now(),
        lastAccessed: Date.now(),
        isOfflineAvailable: true
      };

      await this.db.mcards.put(cacheEntry);
      
      // Check cache size and cleanup if needed
      await this.cleanupCache();
      
      console.log(`📦 Cached MCard: ${hash} (${this.formatBytes(size)})`);
    } catch (error) {
      console.error('❌ Error caching MCard:', error);
    }
  }

  // Retrieve cached MCard content
  async getCachedMCard(hash: string): Promise<MCardCache | null> {
    try {
      const cached = await this.db.mcards.get(hash);
      
      if (cached) {
        // Update last accessed time
        await this.db.mcards.update(hash, { lastAccessed: Date.now() });
        console.log(`📋 Retrieved cached MCard: ${hash}`);
        return cached;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error retrieving cached MCard:', error);
      return null;
    }
  }

  // Check if MCard is cached
  async isCached(hash: string): Promise<boolean> {
    try {
      const count = await this.db.mcards.where('hash').equals(hash).count();
      return count > 0;
    } catch (error) {
      console.error('❌ Error checking cache:', error);
      return false;
    }
  }

  // Get all cached MCards
  async getAllCached(): Promise<MCardCache[]> {
    try {
      return await this.db.mcards.orderBy('lastAccessed').reverse().toArray();
    } catch (error) {
      console.error('❌ Error getting all cached MCards:', error);
      return [];
    }
  }

  // Search cached content
  async searchCached(query: string): Promise<SearchIndex[]> {
    try {
      const results = await this.db.searchIndex
        .filter(item => 
          item.content.toLowerCase().includes(query.toLowerCase()) ||
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
        )
        .toArray();
      
      return results;
    } catch (error) {
      console.error('❌ Error searching cached content:', error);
      return [];
    }
  }

  // Add to search index
  async indexContent(hash: string, content: string, title: string, contentType: string): Promise<void> {
    try {
      // Extract simple tags from content (basic implementation)
      const tags = this.extractTags(content);
      
      const indexEntry: SearchIndex = {
        hash,
        content: content.substring(0, 1000), // Store first 1000 chars for search
        title,
        contentType,
        tags,
        lastIndexed: Date.now()
      };

      await this.db.searchIndex.put(indexEntry);
      console.log(`🔍 Indexed content for search: ${hash}`);
    } catch (error) {
      console.error('❌ Error indexing content:', error);
    }
  }

  // Cache cleanup based on LRU and size limits
  async cleanupCache(): Promise<void> {
    try {
      const totalSize = await this.getCacheSize();
      const totalItems = await this.db.mcards.count();

      if (totalSize > this.maxCacheSize || totalItems > this.maxCacheItems) {
        // Get oldest items by last accessed time
        const oldestItems = await this.db.mcards
          .orderBy('lastAccessed')
          .limit(Math.max(50, Math.floor(totalItems * 0.1))) // Remove 10% or at least 50 items
          .toArray();

        const hashesToDelete = oldestItems.map(item => item.hash);
        
        // Remove from cache and search index
        await this.db.mcards.bulkDelete(hashesToDelete);
        await this.db.searchIndex.where('hash').anyOf(hashesToDelete).delete();
        
        console.log(`🧹 Cleaned up ${hashesToDelete.length} cached items`);
      }
    } catch (error) {
      console.error('❌ Error during cache cleanup:', error);
    }
  }

  // Get total cache size
  async getCacheSize(): Promise<number> {
    try {
      const items = await this.db.mcards.toArray();
      return items.reduce((total, item) => total + item.size, 0);
    } catch (error) {
      console.error('❌ Error calculating cache size:', error);
      return 0;
    }
  }

  // Get cache statistics
  async getCacheStats(): Promise<{
    totalItems: number;
    totalSize: number;
    formattedSize: string;
    oldestItem: string | null;
    newestItem: string | null;
  }> {
    try {
      const items = await this.db.mcards.toArray();
      const totalItems = items.length;
      const totalSize = items.reduce((total, item) => total + item.size, 0);
      
      const sorted = items.sort((a, b) => a.cachedAt - b.cachedAt);
      const oldestItem = sorted[0]?.timestamp || null;
      const newestItem = sorted[sorted.length - 1]?.timestamp || null;

      return {
        totalItems,
        totalSize,
        formattedSize: this.formatBytes(totalSize),
        oldestItem,
        newestItem
      };
    } catch (error) {
      console.error('❌ Error getting cache stats:', error);
      return {
        totalItems: 0,
        totalSize: 0,
        formattedSize: '0 B',
        oldestItem: null,
        newestItem: null
      };
    }
  }

  // User preferences
  async setPreference(key: string, value: any): Promise<void> {
    try {
      await this.db.preferences.put({ key, value, updatedAt: Date.now() });
    } catch (error) {
      console.error('❌ Error setting preference:', error);
    }
  }

  async getPreference(key: string, defaultValue: any = null): Promise<any> {
    try {
      const pref = await this.db.preferences.get(key);
      return pref ? pref.value : defaultValue;
    } catch (error) {
      console.error('❌ Error getting preference:', error);
      return defaultValue;
    }
  }

  // Clear all cached data
  async clearCache(): Promise<void> {
    try {
      await this.db.mcards.clear();
      await this.db.searchIndex.clear();
      console.log('🗑️ Cache cleared');
    } catch (error) {
      console.error('❌ Error clearing cache:', error);
    }
  }

  // Utility methods
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private extractTags(content: string): string[] {
    // Basic tag extraction - can be enhanced
    const words = content.toLowerCase().match(/\b\w{3,}\b/g) || [];
    const uniqueWords = [...new Set(words)];
    return uniqueWords.slice(0, 20); // Limit to 20 tags
  }
}

// Export singleton instance
export const indexedDBService = new IndexedDBService();
