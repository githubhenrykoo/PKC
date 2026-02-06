// Google Docs MCard Integration Service
// This service handles saving Google Docs content to MCard database

class GoogleDocsMCardService {
  constructor() {
    // Get MCard API URL from runtime environment or fallback
    this.baseUrl = this.getMCardApiUrl();
    this.isHealthy = false;
    this.lastHealthCheck = null;
    
    console.log('🔧 GoogleDocsMCardService initialized with baseUrl:', this.baseUrl);
    
    // Check MCard service health on initialization
    this.checkHealth();
  }

  getMCardApiUrl() {
    // Try to get from runtime environment first
    if (typeof window !== 'undefined' && window.RUNTIME_ENV?.PUBLIC_MCARD_API_URL) {
      return window.RUNTIME_ENV.PUBLIC_MCARD_API_URL;
    }
    
    // Fallback to default
    return 'http://localhost:49384/v1';
  }

  // Check if MCard service is available
  async checkHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      this.isHealthy = response.ok;
      this.lastHealthCheck = new Date().toISOString();
      
      if (this.isHealthy) {
        console.log('✅ Google Docs MCard service is healthy');
      } else {
        console.warn('⚠️ Google Docs MCard service health check failed:', response.status);
      }
      
      return this.isHealthy;
    } catch (error) {
      console.error('❌ Google Docs MCard service health check error:', error);
      this.isHealthy = false;
      this.lastHealthCheck = new Date().toISOString();
      return false;
    }
  }

  // Save document content to MCard
  async saveDocument(documentData) {
    try {
      // Check service health first
      if (!this.isHealthy) {
        await this.checkHealth();
        if (!this.isHealthy) {
          throw new Error('MCard service is not available');
        }
      }

      // Create FormData for MCard API
      const formData = new FormData();
      formData.append('content', JSON.stringify(documentData, null, 2));

      const response = await fetch(`${this.baseUrl}/card`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`MCard API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Document saved to MCard:', result);
      
      return {
        success: true,
        hash: result.hash,
        message: 'Document saved successfully'
      };
    } catch (error) {
      console.error('❌ Error saving document to MCard:', error);
      throw new Error(`Failed to save document: ${error.message}`);
    }
  }

  // Save markdown content to MCard
  async saveMarkdown(markdownContent, documentInfo = {}) {
    try {
      const documentData = {
        type: 'google_docs_markdown',
        content: markdownContent,
        documentId: documentInfo.documentId || 'unknown',
        title: documentInfo.title || 'Google Docs Document',
        source: 'google_docs_export',
        exported_at: new Date().toISOString(),
        word_count: markdownContent.split(/\s+/).length,
        character_count: markdownContent.length,
        ...documentInfo
      };

      return await this.saveDocument(documentData);
    } catch (error) {
      console.error('❌ Error saving markdown to MCard:', error);
      throw error;
    }
  }

  // Save document summary to MCard
  async saveDocumentSummary(documents) {
    try {
      const summary = {
        type: 'google_docs_summary',
        total_documents: documents.length,
        documents: documents.map(doc => ({
          documentId: doc.documentId,
          title: doc.title,
          created_at: doc.created_at,
          word_count: doc.word_count || 0,
          character_count: doc.character_count || 0
        })),
        summary_created_at: new Date().toISOString(),
        source: 'google_docs_integration'
      };

      return await this.saveDocument(summary);
    } catch (error) {
      console.error('❌ Error saving document summary to MCard:', error);
      throw error;
    }
  }

  // Create a readable summary of documents
  createReadableSummary(documents) {
    let summary = `# Google Docs Summary\n\n`;
    summary += `Generated on: ${new Date().toLocaleString()}\n`;
    summary += `Total Documents: ${documents.length}\n\n`;

    if (documents.length === 0) {
      summary += `No documents available.\n`;
      return summary;
    }

    // Group documents by date
    const today = new Date();
    const todayStr = today.toDateString();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    const todayDocs = documents.filter(doc => 
      new Date(doc.created_at || doc.exported_at).toDateString() === todayStr
    );
    const yesterdayDocs = documents.filter(doc => 
      new Date(doc.created_at || doc.exported_at).toDateString() === yesterdayStr
    );
    const olderDocs = documents.filter(doc => {
      const docDate = new Date(doc.created_at || doc.exported_at).toDateString();
      return docDate !== todayStr && docDate !== yesterdayStr;
    });

    // Add today's documents
    if (todayDocs.length > 0) {
      summary += `## Today's Documents (${todayDocs.length})\n\n`;
      todayDocs.forEach(doc => {
        summary += `- **${doc.title}**\n`;
        summary += `  - Document ID: ${doc.documentId}\n`;
        if (doc.word_count) summary += `  - Words: ${doc.word_count}\n`;
        if (doc.character_count) summary += `  - Characters: ${doc.character_count}\n`;
        summary += `\n`;
      });
    }

    // Add yesterday's documents
    if (yesterdayDocs.length > 0) {
      summary += `## Yesterday's Documents (${yesterdayDocs.length})\n\n`;
      yesterdayDocs.forEach(doc => {
        summary += `- **${doc.title}**\n`;
        summary += `  - Document ID: ${doc.documentId}\n`;
        if (doc.word_count) summary += `  - Words: ${doc.word_count}\n`;
        summary += `\n`;
      });
    }

    // Add older documents
    if (olderDocs.length > 0) {
      summary += `## Older Documents (${olderDocs.length})\n\n`;
      olderDocs.forEach(doc => {
        const date = new Date(doc.created_at || doc.exported_at).toLocaleDateString();
        summary += `- **${doc.title}** (${date})\n`;
        summary += `  - Document ID: ${doc.documentId}\n`;
        summary += `\n`;
      });
    }

    // Add statistics
    const totalWords = documents.reduce((sum, doc) => sum + (doc.word_count || 0), 0);
    const totalChars = documents.reduce((sum, doc) => sum + (doc.character_count || 0), 0);
    
    summary += `## Statistics\n\n`;
    summary += `- Total Documents: ${documents.length}\n`;
    summary += `- Total Words: ${totalWords.toLocaleString()}\n`;
    summary += `- Total Characters: ${totalChars.toLocaleString()}\n`;
    summary += `- Average Words per Document: ${Math.round(totalWords / documents.length)}\n`;

    return summary;
  }

  // Save readable summary to MCard
  async saveReadableSummary(documents) {
    try {
      const readableSummary = this.createReadableSummary(documents);
      
      const summaryData = {
        type: 'google_docs_readable_summary',
        content: readableSummary,
        format: 'markdown',
        total_documents: documents.length,
        summary_created_at: new Date().toISOString(),
        source: 'google_docs_integration'
      };

      return await this.saveDocument(summaryData);
    } catch (error) {
      console.error('❌ Error saving readable summary to MCard:', error);
      throw error;
    }
  }

  // Batch save multiple documents
  async batchSaveDocuments(documents) {
    const results = {
      successful: [],
      failed: [],
      summary: null,
      readableSummary: null
    };

    console.log(`🔄 Saving ${documents.length} documents to MCard...`);

    // Save individual documents
    for (const doc of documents) {
      try {
        const result = await this.saveDocument(doc);
        results.successful.push({
          documentId: doc.documentId,
          title: doc.title,
          hash: result.hash
        });
        console.log(`✅ Saved document: ${doc.title}`);
      } catch (error) {
        console.error(`❌ Failed to save document: ${doc.title}`, error);
        results.failed.push({
          documentId: doc.documentId,
          title: doc.title,
          error: error.message
        });
      }
    }

    // Save summary
    try {
      const summaryResult = await this.saveDocumentSummary(documents);
      results.summary = summaryResult;
      console.log('✅ Document summary saved to MCard');
    } catch (error) {
      console.error('❌ Failed to save document summary:', error);
    }

    // Save readable summary
    try {
      const readableSummaryResult = await this.saveReadableSummary(documents);
      results.readableSummary = readableSummaryResult;
      console.log('✅ Readable summary saved to MCard');
    } catch (error) {
      console.error('❌ Failed to save readable summary:', error);
    }

    console.log(`📊 MCard save results: ${results.successful.length} successful, ${results.failed.length} failed`);
    
    return results;
  }

  // Get service status
  getStatus() {
    return {
      healthy: this.isHealthy,
      lastHealthCheck: this.lastHealthCheck,
      baseUrl: this.baseUrl
    };
  }
}

// Export singleton instance
export const googleDocsMCardService = new GoogleDocsMCardService();

// Export individual functions for convenience
export const {
  checkHealth,
  saveDocument,
  saveMarkdown,
  saveDocumentSummary,
  saveReadableSummary,
  batchSaveDocuments,
  createReadableSummary,
  getStatus
} = googleDocsMCardService;

export default googleDocsMCardService;
