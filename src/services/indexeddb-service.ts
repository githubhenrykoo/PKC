import Dexie, { type Table } from 'dexie';
import type { MCard } from '../store/types/data';

// Shared SQL-like schema for MCard storage engines
// CREATE TABLE card (hash TEXT PRIMARY KEY, content TEXT NOT NULL, g_time TEXT)
export interface Card {
  hash: string;      // Primary key - MCard hash
  content: string;   // TEXT (human-readable). For binary, stored as base64 string
  g_time?: string;   // g_time
}

// Additional attributes moved to separate tables keyed by hash
export interface CardCacheMeta {
  hash: string;           // PK and FK to Card.hash
  contentType: string;    // MIME type
  size: number;           // Content size in bytes
  cachedAt: number;       // Local cache timestamp
  lastAccessed: number;   // Last access time for LRU cleanup
  isOfflineAvailable: boolean; // Flag for offline availability
  filename?: string;      // Optional filename
}

export interface CardMetadata {
  hash: string;           // PK and FK to Card.hash
  metadata: MCard;        // Full MCard metadata object
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
  value: any;            // Preference value
  updatedAt: number;     // Last update timestamp
}

// Public type for joined cached MCard records
export type CachedMCard = {
  hash: string;
  content: string;
  metadata: MCard;
  contentType: string;
  size: number;
  timestamp: string;
  cachedAt: number;
  lastAccessed: number;
  isOfflineAvailable: boolean;
};

// Dexie database class
export class PKCDatabase extends Dexie {
  // Core MCard table (common schema)
  cards!: Table<Card, string>;
  // Separate attribute tables
  card_cache!: Table<CardCacheMeta, string>;
  card_metadata!: Table<CardMetadata, string>;
  // Search index and preferences
  searchIndex!: Table<SearchIndex, number>;
  preferences!: Table<UserPreferences, string>;

  constructor() {
    super('PKCDatabase');
    // v1 schema (legacy): mcards table
    this.version(1).stores({
      mcards: 'hash, contentType, timestamp, cachedAt, lastAccessed, isOfflineAvailable',
      searchIndex: '++id, hash, contentType, title, lastIndexed',
      preferences: 'key, updatedAt'
    });

    // v2 schema: normalize to shared MCard schema
    this.version(2).stores({
      cards: 'hash, g_time',
      card_cache: 'hash, contentType, cachedAt, lastAccessed',
      card_metadata: 'hash',
      searchIndex: '++id, hash, contentType, title, lastIndexed',
      preferences: 'key, updatedAt'
    }).upgrade(async (tx) => {
      // Migrate from v1.mcards -> v2.cards + card_cache + card_metadata
      try {
        const oldMCards = await (tx.table('mcards') as Dexie.Table<any, string>).toArray().catch(() => []);
        for (const old of oldMCards) {
          const hash = old.hash as string;
          const g_time = old.timestamp as string | undefined;
          // Ensure content is string; old.content may be Blob or string
          let contentText: string;
          if (typeof old.content === 'string') contentText = old.content;
          else if (old.content && typeof old.content.text === 'function') contentText = await old.content.text();
          else contentText = '';

          await (tx.table('cards') as Dexie.Table<Card, string>).put({ hash, content: contentText, g_time });
          await (tx.table('card_cache') as Dexie.Table<CardCacheMeta, string>).put({
            hash,
            contentType: old.contentType || 'text/plain',
            size: old.size || new Blob([contentText]).size,
            cachedAt: old.cachedAt || Date.now(),
            lastAccessed: old.lastAccessed || Date.now(),
            isOfflineAvailable: old.isOfflineAvailable ?? true,
            filename: old.metadata?.filename
          });
          if (old.metadata) {
            await (tx.table('card_metadata') as Dexie.Table<CardMetadata, string>).put({ hash, metadata: old.metadata });
          }
        }
      } catch (e) {
        console.warn('⚠️ IndexedDB migration v1->v2 skipped or failed:', e);
      }
    });

    // Hooks
    this.card_cache.hook('creating', (_pk, obj) => {
      (obj as CardCacheMeta).cachedAt = Date.now();
      (obj as CardCacheMeta).lastAccessed = Date.now();
    });

    this.card_cache.hook('updating', (modifications) => {
      (modifications as Partial<CardCacheMeta>).lastAccessed = Date.now();
    });

    this.preferences.hook('creating', (_pk, obj) => {
      (obj as UserPreferences).updatedAt = Date.now();
    });

    this.preferences.hook('updating', (modifications) => {
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

  // Cache MCard content into normalized schema
  async cacheMCard(hash: string, content: string | Blob, metadata: MCard): Promise<void> {
    try {
      // Convert content to TEXT per shared schema
      const contentText = await this.ensureTextContent(content, metadata.contentType);
      const size = new Blob([contentText]).size;

      // Upsert cards row
      const card: Card = { hash, content: contentText, g_time: metadata.timestamp };
      await this.db.cards.put(card);

      // Upsert attribute tables
      const cacheMeta: CardCacheMeta = {
        hash,
        contentType: metadata.contentType,
        size,
        cachedAt: Date.now(),
        lastAccessed: Date.now(),
        isOfflineAvailable: true,
        filename: metadata.filename
      };
      await this.db.card_cache.put(cacheMeta);

      const metaRow: CardMetadata = { hash, metadata };
      await this.db.card_metadata.put(metaRow);
      
      // Check cache size and cleanup if needed
      await this.cleanupCache();
      
      console.log(`📦 Cached MCard: ${hash} (${this.formatBytes(size)})`);
    } catch (error) {
      console.error('❌ Error caching MCard:', error);
    }
  }

  // Retrieve cached MCard content
  async getCachedMCard(hash: string): Promise<{
    hash: string;
    content: string;
    metadata: MCard;
    contentType: string;
    size: number;
    timestamp: string;
    cachedAt: number;
    lastAccessed: number;
    isOfflineAvailable: boolean;
  } | null> {
    try {
      const card = await this.db.cards.get(hash);
      if (!card) return null;

      const [cacheMeta, metaRow] = await Promise.all([
        this.db.card_cache.get(hash),
        this.db.card_metadata.get(hash)
      ]);

      if (cacheMeta) {
        await this.db.card_cache.update(hash, { lastAccessed: Date.now() });
      }

      const result = {
        hash,
        content: card.content,
        metadata: metaRow?.metadata || ({} as MCard),
        contentType: cacheMeta?.contentType || 'text/plain',
        size: cacheMeta?.size || new Blob([card.content]).size,
        timestamp: card.g_time || '',
        cachedAt: cacheMeta?.cachedAt || 0,
        lastAccessed: cacheMeta?.lastAccessed || Date.now(),
        isOfflineAvailable: cacheMeta?.isOfflineAvailable ?? true,
      };
      console.log(`📋 Retrieved cached MCard: ${hash}`);
      return result;
      
    } catch (error) {
      console.error('❌ Error retrieving cached MCard:', error);
      return null;
    }
  }

  // Check if MCard is cached
  async isCached(hash: string): Promise<boolean> {
    try {
      const exists = await this.db.cards.get(hash);
      return !!exists;
    } catch (error) {
      console.error('❌ Error checking cache:', error);
      return false;
    }
  }

  // Bulk cache multiple MCards into the normalized schema
  async bulkCacheMCards(mcards: MCard[]): Promise<void> {
    if (!mcards || mcards.length === 0) return;

    try {
      await this.db.transaction('rw', this.db.cards, this.db.card_cache, this.db.card_metadata, async () => {
        const cardsToPut: Card[] = [];
        const cacheMetasToPut: CardCacheMeta[] = [];
        const metadataToPut: CardMetadata[] = [];

        for (const mcard of mcards) {
          // For bulk caching, we assume content is not available yet and will be fetched on demand.
          const contentText = ''; 
          const size = mcard.size || 0;

          cardsToPut.push({ hash: mcard.hash, content: contentText, g_time: mcard.timestamp });
          cacheMetasToPut.push({
            hash: mcard.hash,
            contentType: mcard.contentType,
            size,
            cachedAt: Date.now(),
            lastAccessed: Date.now(),
            isOfflineAvailable: false, // Content is not yet cached
            filename: mcard.filename
          });
          metadataToPut.push({ hash: mcard.hash, metadata: mcard });
        }

        await this.db.cards.bulkPut(cardsToPut);
        await this.db.card_cache.bulkPut(cacheMetasToPut);
        await this.db.card_metadata.bulkPut(metadataToPut);
      });

      console.log(`📦 Bulk cached ${mcards.length} MCard metadata records.`);
      await this.cleanupCache();

    } catch (error) {
      console.error('❌ Error bulk caching MCards:', error);
    }
  }

  // Get all cached MCard metadata for list views
  async getAllMCardMetadata(): Promise<MCard[]> {
    try {
      const metadataRows = await this.db.card_metadata.toArray();
      return metadataRows.map(row => row.metadata).sort((a, b) => {
        // Sort by timestamp descending
        return (b.timestamp && a.timestamp) ? b.timestamp.localeCompare(a.timestamp) : 0;
      });
    } catch (error) {
      console.error('❌ Error getting all cached MCard metadata:', error);
      return [];
    }
  }

  // Get all cached MCards
  

  async getAllCached(): Promise<CachedMCard[]> {
    try {
      // Join cards with cache/meta
      const cards = await this.db.cards.toArray();
      const results = await Promise.all(cards.map(async (c) => {
        const [cacheMeta, metaRow] = await Promise.all([
          this.db.card_cache.get(c.hash),
          this.db.card_metadata.get(c.hash)
        ]);
        return {
          hash: c.hash,
          content: c.content,
          metadata: metaRow?.metadata || ({} as MCard),
          contentType: cacheMeta?.contentType || 'text/plain',
          size: cacheMeta?.size || new Blob([c.content]).size,
          timestamp: c.g_time || '',
          cachedAt: cacheMeta?.cachedAt || 0,
          lastAccessed: cacheMeta?.lastAccessed || 0,
          isOfflineAvailable: cacheMeta?.isOfflineAvailable ?? true
        };
      }));
      // Sort by lastAccessed desc
      return results.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));
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
      const totalItems = await this.db.cards.count();

      if (totalSize > this.maxCacheSize || totalItems > this.maxCacheItems) {
        // Get oldest items by last accessed time
        const oldestMetas = await this.db.card_cache
          .orderBy('lastAccessed')
          .limit(Math.max(50, Math.floor(totalItems * 0.1)))
          .toArray();

        const hashesToDelete = oldestMetas.map(item => item.hash);
        
        // Remove from cache and search index
        await this.db.cards.bulkDelete(hashesToDelete);
        await this.db.card_cache.bulkDelete(hashesToDelete);
        await this.db.card_metadata.bulkDelete(hashesToDelete);
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
      const metas = await this.db.card_cache.toArray();
      return metas.reduce((total, m) => total + (m.size || 0), 0);
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
      const metas = await this.db.card_cache.toArray();
      const cards = await this.db.cards.toArray();
      const totalItems = cards.length;
      const totalSize = metas.reduce((total, m) => total + (m.size || 0), 0);
      const sorted = metas.sort((a, b) => a.cachedAt - b.cachedAt);
      const oldestCard = sorted[0] ? await this.db.cards.get(sorted[0].hash) : null;
      const newestCard = sorted[sorted.length - 1] ? await this.db.cards.get(sorted[sorted.length - 1].hash) : null;
      const oldestItem = oldestCard?.g_time || null;
      const newestItem = newestCard?.g_time || null;

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
      await this.db.cards.clear();
      await this.db.card_cache.clear();
      await this.db.card_metadata.clear();
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

  // Convert content to TEXT per shared schema (base64 for binary)
  private async ensureTextContent(content: string | Blob, contentType: string): Promise<string> {
    if (typeof content === 'string') return content;
    // If textual content, decode as text; otherwise base64 encode
    if (contentType && (contentType.includes('text/') || contentType.includes('json') || contentType.includes('markdown') || contentType.includes('html'))) {
      return await content.text();
    }
    const arrayBuffer = await content.arrayBuffer();
    const base64 = this.arrayBufferToBase64(arrayBuffer);
    return `data:${contentType || 'application/octet-stream'};base64,${base64}`;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as any);
    }
    return btoa(binary);
  }
}

// Export singleton instance
export const indexedDBService = new IndexedDBService();
