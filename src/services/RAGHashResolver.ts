import type { RAGQueryResult, RAGCitation, RAGDocument } from './RAGService';

/**
 * RAGHashResolver - Utility to resolve missing hash values in RAG query results
 * 
 * This utility addresses an issue where the RAG service returns "unknown" for document hashes
 * by retrieving the correct hashes from a document list or g_time mapping.
 */
export class RAGHashResolver {
  private hashByGTime: Map<string, string> = new Map();
  
  /**
   * Initialize the hash resolver with a list of documents
   * @param documents The list of documents with valid hash values
   */
  constructor(documents?: RAGDocument[]) {
    if (documents) {
      this.updateDocumentCache(documents);
    }
  }

  /**
   * Update the internal document cache with new documents
   * @param documents The list of documents with valid hash values
   */
  public updateDocumentCache(documents: RAGDocument[]): void {
    documents.forEach(doc => {
      if (doc.hash && doc.g_time) {
        // Store mapping from g_time to hash
        this.hashByGTime.set(doc.g_time, doc.hash);
      }
    });
  }

  /**
   * Fix "unknown" hashes in RAG query results using the g_time field
   * @param queryResult The RAG query result with potentially unknown hashes
   * @returns A fixed RAG query result with correct hash values
   */
  public resolveHashes(queryResult: RAGQueryResult): RAGQueryResult {
    if (!queryResult || !queryResult.citations) {
      return queryResult;
    }

    const fixedCitations: RAGCitation[] = queryResult.citations.map(citation => {
      // Check if hash is unknown and we have a g_time mapping
      if ((citation.hash === 'unknown' || !citation.hash) && citation.g_time && this.hashByGTime.has(citation.g_time)) {
        return {
          ...citation,
          hash: this.hashByGTime.get(citation.g_time) || citation.hash
        };
      }
      return citation;
    });

    return {
      ...queryResult,
      citations: fixedCitations
    };
  }

  /**
   * Get the resolved hash for a specific g_time value
   * @param gTime The g_time value to look up
   * @returns The corresponding hash or undefined if not found
   */
  public getHashForGTime(gTime: string): string | undefined {
    return this.hashByGTime.get(gTime);
  }

  /**
   * Check if the hash resolver has mappings available
   * @returns True if there are hash mappings available, false otherwise
   */
  public hasMappings(): boolean {
    return this.hashByGTime.size > 0;
  }
}

// Export a singleton instance for global use
export const ragHashResolver = new RAGHashResolver();
