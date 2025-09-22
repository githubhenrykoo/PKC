/**
 * Google Slides MCard Integration Service (JavaScript version for browser compatibility)
 * Handles saving Google Slides presentations to MCard Service
 */

// Simple MCard service implementation for browser use
class BrowserMCardService {
  constructor() {
    // Get MCard API URL from runtime environment or fallback
    this.baseUrl = this.getMCardApiUrl();
    console.log('🔧 BrowserMCardService initialized with baseUrl:', this.baseUrl);
  }

  getMCardApiUrl() {
    // Try to get from runtime environment first
    if (typeof window !== 'undefined' && window.RUNTIME_ENV?.PUBLIC_MCARD_API_URL) {
      return window.RUNTIME_ENV.PUBLIC_MCARD_API_URL;
    }
    
    // Fallback to default
    return 'http://localhost:49384/v1';
  }

  async storeContent(content) {
    try {
      const formData = new FormData();
      formData.append('content', content);
      
      const url = `${this.baseUrl}/card`;
      console.log(`📤 Storing content to MCard: ${url}`);
      
      const response = await fetch(url, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`MCard API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Content stored successfully:', result.hash);
      return result;
    } catch (error) {
      console.error('❌ Failed to store content to MCard:', error);
      throw error;
    }
  }
}

// Google Slides MCard Service
class GoogleSlidesMCardService {
  constructor() {
    this.mcardService = new BrowserMCardService();
  }

  /**
   * Save individual presentation to MCard
   */
  async savePresentationToMCard(presentation, presentationDetails = null) {
    try {
      // Create a structured presentation document
      const presentationDocument = {
        type: 'google_slides_presentation',
        presentationId: presentation.id,
        title: presentation.name,
        createdTime: presentation.createdTime,
        modifiedTime: presentation.modifiedTime,
        webViewLink: presentation.webViewLink,
        thumbnailLink: presentation.thumbnailLink,
        owners: presentation.owners || [],
        slideCount: presentationDetails?.slides?.length || 0,
        slides: presentationDetails?.slides?.map(slide => ({
          objectId: slide.objectId,
          slideProperties: slide.slideProperties,
          pageElements: slide.pageElements?.map(element => ({
            objectId: element.objectId,
            size: element.size,
            transform: element.transform,
            title: element.title,
            description: element.description,
            shape: element.shape ? {
              shapeType: element.shape.shapeType,
              text: element.shape.text?.textElements?.map(textEl => 
                textEl.textRun?.content || ''
              ).join('') || ''
            } : null
          })) || []
        })) || [],
        savedToMCard: new Date().toISOString(),
        source: 'google_slides'
      };

      // Convert to JSON string for storage
      const presentationJson = JSON.stringify(presentationDocument, null, 2);

      // Save to MCard
      const response = await this.mcardService.storeContent(presentationJson);

      console.log(`✅ Saved presentation "${presentation.name}" to MCard:`, response.hash);
      return response.hash;
    } catch (error) {
      console.error(`❌ Failed to save presentation "${presentation.name}" to MCard:`, error);
      throw error;
    }
  }

  /**
   * Save presentations summary to MCard
   */
  async savePresentationsSummaryToMCard(presentations, userEmail = 'unknown_user') {
    try {
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Filter presentations by modification time
      const recentPresentations = presentations.filter(presentation => {
        const modifiedDate = new Date(presentation.modifiedTime || '');
        return modifiedDate >= oneWeekAgo;
      });

      const monthlyPresentations = presentations.filter(presentation => {
        const modifiedDate = new Date(presentation.modifiedTime || '');
        return modifiedDate >= oneMonthAgo;
      });

      // Create summary document
      const summary = {
        type: 'google_slides_summary',
        totalPresentations: presentations.length,
        recentPresentations: recentPresentations.map(this.simplifyPresentation),
        monthlyPresentations: monthlyPresentations.map(this.simplifyPresentation),
        allPresentations: presentations.slice(0, 20).map(this.simplifyPresentation), // Limit to 20 most recent
        lastSyncTime: now.toISOString(),
        syncedBy: userEmail,
        source: 'google_slides'
      };

      // Convert to formatted JSON
      const summaryJson = JSON.stringify(summary, null, 2);

      // Save summary to MCard
      const response = await this.mcardService.storeContent(summaryJson);

      console.log(`✅ Saved presentations summary (${presentations.length} presentations) to MCard:`, response.hash);
      return response.hash;
    } catch (error) {
      console.error('❌ Failed to save presentations summary to MCard:', error);
      throw error;
    }
  }

  /**
   * Save all presentations to MCard (both individual presentations and summary)
   */
  async saveAllPresentationsToMCard(presentations, userEmail = 'unknown_user') {
    console.log(`🔄 Starting to save ${presentations.length} Google Slides presentations to MCard...`);

    const presentationHashes = [];
    let savedCount = 0;
    let failedCount = 0;

    // Save individual presentations (limit to recent ones to avoid overwhelming MCard)
    const presentationsToSave = presentations.slice(0, 10); // Save up to 10 most recent presentations
    
    for (const presentation of presentationsToSave) {
      try {
        const hash = await this.savePresentationToMCard(presentation);
        presentationHashes.push(hash);
        savedCount++;
      } catch (error) {
        console.warn(`Failed to save presentation ${presentation.id}:`, error);
        failedCount++;
      }
    }

    // Save summary (always save this)
    const summaryHash = await this.savePresentationsSummaryToMCard(presentations, userEmail);

    // Also save a readable summary
    const readableHash = await this.saveReadableSummaryToMCard(presentations, userEmail);

    console.log(`✅ MCard sync complete: ${savedCount} presentations saved, ${failedCount} failed, summary saved`);

    return {
      summaryHash,
      readableHash,
      presentationHashes,
      savedCount,
      failedCount
    };
  }

  /**
   * Simplify presentation object for summary
   */
  simplifyPresentation(presentation) {
    return {
      id: presentation.id,
      name: presentation.name,
      createdTime: presentation.createdTime,
      modifiedTime: presentation.modifiedTime,
      webViewLink: presentation.webViewLink,
      thumbnailLink: presentation.thumbnailLink,
      owners: presentation.owners?.map(owner => owner.displayName || owner.emailAddress) || []
    };
  }

  /**
   * Create a readable text summary of presentations
   */
  async saveReadableSummaryToMCard(presentations, userEmail = 'unknown_user') {
    try {
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Filter recent presentations
      const recentPresentations = presentations.filter(presentation => {
        const modifiedDate = new Date(presentation.modifiedTime || '');
        return modifiedDate >= oneWeekAgo;
      });

      // Create readable summary
      let summary = `# Google Slides Summary\n\n`;
      summary += `**Sync Date:** ${now.toLocaleDateString()} ${now.toLocaleTimeString()}\n`;
      summary += `**User:** ${userEmail}\n`;
      summary += `**Total Presentations:** ${presentations.length}\n\n`;

      // Recent presentations
      summary += `## Recently Modified Presentations (${recentPresentations.length})\n\n`;
      if (recentPresentations.length === 0) {
        summary += `No presentations modified in the last week. Time to create something new! 🎨\n\n`;
      } else {
        recentPresentations.forEach((presentation, index) => {
          const modifiedDate = new Date(presentation.modifiedTime || '');
          
          summary += `${index + 1}. **${presentation.name}**\n`;
          summary += `   - Last Modified: ${modifiedDate.toLocaleDateString()} ${modifiedDate.toLocaleTimeString()}\n`;
          summary += `   - Link: ${presentation.webViewLink}\n`;
          if (presentation.owners && presentation.owners.length > 0) {
            const ownerNames = presentation.owners.map(owner => owner.displayName || owner.emailAddress).join(', ');
            summary += `   - Owner(s): ${ownerNames}\n`;
          }
          summary += `\n`;
        });
      }

      // All presentations (most recent 15)
      const topPresentations = presentations.slice(0, 15);
      summary += `## All Presentations (Most Recent 15)\n\n`;
      topPresentations.forEach((presentation, index) => {
        const modifiedDate = new Date(presentation.modifiedTime || '');
        summary += `${index + 1}. **${presentation.name}** - Modified: ${modifiedDate.toLocaleDateString()}\n`;
        summary += `   - Link: ${presentation.webViewLink}\n`;
      });

      summary += `\n---\n\n`;
      summary += `💡 **Tip:** Use these presentations for your next meeting or project. Click the links to open them in Google Slides!\n`;

      // Save readable summary
      const response = await this.mcardService.storeContent(summary);

      console.log(`✅ Saved readable presentations summary to MCard:`, response.hash);
      return response.hash;
    } catch (error) {
      console.error('❌ Failed to save readable presentations summary to MCard:', error);
      throw error;
    }
  }

  /**
   * Get MCard service health status
   */
  async getMCardStatus() {
    try {
      // Simple health check by trying to access the base URL
      const response = await fetch(`${this.mcardService.baseUrl}/health`);
      return response.ok;
    } catch (error) {
      console.error('MCard service health check failed:', error);
      return false;
    }
  }
}

// Export default instance
export const googleSlidesMCardService = new GoogleSlidesMCardService();
export default googleSlidesMCardService;
