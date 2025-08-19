import React, { useState, useEffect } from 'react';
import { mcardService } from '../../services/mcard-service';
import { indexedDBService } from '../../services/indexeddb-service';

interface CacheStats {
  totalItems: number;
  totalSize: number;
  formattedSize: string;
  oldestItem: string | null;
  newestItem: string | null;
}

export const IndexedDBTest: React.FC = () => {
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addTestResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const loadCacheStats = async () => {
    try {
      const stats = await mcardService.getCacheStats();
      setCacheStats(stats);
      addTestResult(`📊 Cache stats loaded: ${stats.totalItems} items, ${stats.formattedSize}`);
    } catch (error) {
      addTestResult(`❌ Failed to load cache stats: ${error}`);
    }
  };

  const testBasicOperations = async () => {
    setIsLoading(true);
    addTestResult('🧪 Starting IndexedDB basic operations test...');

    try {
      // Test 1: Store a preference
      await indexedDBService.setPreference('test_key', 'test_value');
      addTestResult('✅ Preference stored successfully');

      // Test 2: Retrieve the preference
      const value = await indexedDBService.getPreference('test_key');
      if (value === 'test_value') {
        addTestResult('✅ Preference retrieved successfully');
      } else {
        addTestResult('❌ Preference retrieval failed');
      }

      // Test 3: Test cache functionality with mock data
      const mockMCard = {
        hash: 'test_hash_123',
        contentType: 'text/plain',
        size: 100,
        timestamp: new Date().toISOString(),
        metadata: {},
        filename: 'test_document.txt'
      };

      const mockContent = 'This is test content for IndexedDB caching';
      
      await indexedDBService.cacheMCard('test_hash_123', mockContent, mockMCard);
      addTestResult('✅ Mock MCard cached successfully');

      // Test 4: Retrieve cached content
      const cachedMCard = await indexedDBService.getCachedMCard('test_hash_123');
      if (cachedMCard && cachedMCard.content === mockContent) {
        addTestResult('✅ Cached MCard retrieved successfully');
      } else {
        addTestResult('❌ Cached MCard retrieval failed');
      }

      // Test 5: Search functionality
      await indexedDBService.indexContent('test_hash_123', mockContent, 'Test Document', 'text/plain');
      addTestResult('✅ Content indexed for search');

      const searchResults = await indexedDBService.searchCached('test content');
      if (searchResults.length > 0) {
        addTestResult(`✅ Search found ${searchResults.length} results`);
      } else {
        addTestResult('❌ Search returned no results');
      }

      addTestResult('🎉 All basic operations completed successfully!');
      
    } catch (error) {
      addTestResult(`❌ Test failed: ${error}`);
    } finally {
      setIsLoading(false);
      await loadCacheStats();
    }
  };

  const testMCardIntegration = async () => {
    setIsLoading(true);
    addTestResult('🧪 Testing MCard service integration...');

    try {
      // Get the first few MCards from the API
      const mcards = await mcardService.fetchMCards({ page: 1, pageSize: 3 });
      addTestResult(`📋 Fetched ${mcards.items.length} MCards from API`);

      if (mcards.items.length > 0) {
        const firstMCard = mcards.items[0];
        addTestResult(`🎯 Testing with MCard: ${firstMCard.hash.substring(0, 12)}...`);

        // Test caching the first MCard
        await mcardService.cacheForOffline(firstMCard.hash);
        addTestResult('✅ MCard cached for offline use');

        // Verify it's available offline
        const isOffline = await mcardService.isAvailableOffline(firstMCard.hash);
        if (isOffline) {
          addTestResult('✅ MCard confirmed available offline');
        } else {
          addTestResult('❌ MCard not found in offline cache');
        }

        addTestResult('🎉 MCard integration test completed!');
      } else {
        addTestResult('⚠️ No MCards available for testing');
      }

    } catch (error) {
      addTestResult(`❌ MCard integration test failed: ${error}`);
    } finally {
      setIsLoading(false);
      await loadCacheStats();
    }
  };

  const clearCache = async () => {
    try {
      await mcardService.clearCache();
      addTestResult('🗑️ Cache cleared successfully');
      await loadCacheStats();
    } catch (error) {
      addTestResult(`❌ Failed to clear cache: ${error}`);
    }
  };

  const clearTestResults = () => {
    setTestResults([]);
  };

  useEffect(() => {
    loadCacheStats();
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">IndexedDB Test Console</h2>
      
      {/* Cache Statistics */}
      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <h3 className="text-lg font-semibold mb-2">Cache Statistics</h3>
        {cacheStats ? (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>Total Items: <span className="font-mono">{cacheStats.totalItems}</span></div>
            <div>Total Size: <span className="font-mono">{cacheStats.formattedSize}</span></div>
            <div>Oldest Item: <span className="font-mono text-xs">{cacheStats.oldestItem || 'None'}</span></div>
            <div>Newest Item: <span className="font-mono text-xs">{cacheStats.newestItem || 'None'}</span></div>
          </div>
        ) : (
          <div>Loading cache statistics...</div>
        )}
      </div>

      {/* Test Controls */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={testBasicOperations}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? 'Testing...' : 'Test Basic Operations'}
        </button>
        
        <button
          onClick={testMCardIntegration}
          disabled={isLoading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          {isLoading ? 'Testing...' : 'Test MCard Integration'}
        </button>
        
        <button
          onClick={loadCacheStats}
          disabled={isLoading}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
        >
          Refresh Stats
        </button>
        
        <button
          onClick={clearCache}
          disabled={isLoading}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
        >
          Clear Cache
        </button>
        
        <button
          onClick={clearTestResults}
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
        >
          Clear Results
        </button>
      </div>

      {/* Test Results */}
      <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm">
        <h3 className="text-white mb-2">Test Results:</h3>
        <div className="max-h-96 overflow-y-auto">
          {testResults.length === 0 ? (
            <div className="text-gray-500">No test results yet. Click a test button to start.</div>
          ) : (
            testResults.map((result, index) => (
              <div key={index} className="mb-1">
                {result}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Usage Instructions */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Usage Instructions</h3>
        <ul className="text-sm space-y-1">
          <li>• <strong>Test Basic Operations:</strong> Tests core IndexedDB functionality (preferences, caching, search)</li>
          <li>• <strong>Test MCard Integration:</strong> Tests integration with real MCard API data</li>
          <li>• <strong>Refresh Stats:</strong> Updates cache statistics display</li>
          <li>• <strong>Clear Cache:</strong> Removes all cached data from IndexedDB</li>
          <li>• Open browser DevTools → Application → IndexedDB → PKCDatabase to inspect the database</li>
        </ul>
      </div>
    </div>
  );
};

export default IndexedDBTest;
