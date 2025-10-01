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
    };
  }

  /**
   * Create a readable JSON summary of presentations
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

      // Create structured JSON summary
      const readableSummary = {
        type: 'google_slides_readable_summary',
        title: 'Google Slides Summary',
        syncInfo: {
          syncDate: now.toISOString(),
          syncDateFormatted: `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`,
          user: userEmail,
          totalPresentations: presentations.length
        },
        recentPresentations: {
          title: 'Recently Modified Presentations',
          count: recentPresentations.length,
          timeframe: 'Last 7 days',
          presentations: recentPresentations.length === 0 ? [] : recentPresentations.map((presentation, index) => {
            const modifiedDate = new Date(presentation.modifiedTime || '');
            return {
              index: index + 1,
              name: presentation.name,
              id: presentation.id,
              lastModified: modifiedDate.toISOString(),
              lastModifiedFormatted: `${modifiedDate.toLocaleDateString()} ${modifiedDate.toLocaleTimeString()}`,
              link: presentation.webViewLink,
              thumbnailLink: presentation.thumbnailLink
            };
          }),
          message: recentPresentations.length === 0 ? 'No presentations modified in the last week. Time to create something new! 🎨' : null
        },
        allPresentations: {
          title: 'All Presentations (Most Recent 15)',
          count: Math.min(presentations.length, 15),
          presentations: presentations.slice(0, 15).map((presentation, index) => {
            const modifiedDate = new Date(presentation.modifiedTime || '');
            return {
              index: index + 1,
              name: presentation.name,
              id: presentation.id,
              lastModified: modifiedDate.toISOString(),
              lastModifiedFormatted: modifiedDate.toLocaleDateString(),
              link: presentation.webViewLink,
              thumbnailLink: presentation.thumbnailLink
            };
          })
        },
        tips: [
          'Use these presentations for your next meeting or project',
          'Click the links to open them in Google Slides',
          'Check the thumbnails for quick visual reference'
        ],
        metadata: {
          source: 'google_slides',
          format: 'json',
          version: '1.0',
          generatedAt: now.toISOString()
        }
      };

      // Convert to formatted JSON
      const summaryJson = JSON.stringify(readableSummary, null, 2);

      // Save readable summary
      const response = await this.mcardService.storeContent(summaryJson);

      console.log(`✅ Saved readable presentations summary (JSON format) to MCard:`, response.hash);
      return response.hash;
    } catch (error) {
      console.error('❌ Failed to save readable presentations summary to MCard:', error);
      throw error;
    }
  }

  /**
   * Save JSON editor data to MCard
   */
  async saveJsonEditorToMCard(presentationId, originalJson, editedJson, changes, userEmail = 'unknown_user') {
    try {
      const now = new Date();
      
      // Create a comprehensive JSON editor document
      const jsonEditorDocument = {
        type: 'google_slides_json_editor',
        presentationId: presentationId,
        editSession: {
          timestamp: now.toISOString(),
          user: userEmail,
          changesCount: changes.length
        },
        originalData: originalJson,
        editedData: editedJson,
        detectedChanges: changes.map(change => ({
          type: change.type,
          objectId: change.objectId,
          slideIndex: change.slideIndex,
          elementIndex: change.elementIndex,
          textIndex: change.textIndex,
          description: this.getChangeDescription(change)
        })),
        metadata: {
          source: 'google_slides_json_editor',
          format: 'json',
          version: '1.0',
          savedAt: now.toISOString()
        }
      };

      // Convert to JSON string for storage
      const jsonEditorJson = JSON.stringify(jsonEditorDocument, null, 2);

      // Save to MCard
      const response = await this.mcardService.storeContent(jsonEditorJson);

      console.log(`✅ Saved JSON editor session for presentation "${presentationId}" to MCard:`, response.hash);
      return response.hash;
    } catch (error) {
      console.error(`❌ Failed to save JSON editor session to MCard:`, error);
      throw error;
    }
  }

  /**
   * Save JSON editor changes summary to MCard (human-readable format)
   */
  async saveJsonEditorSummaryToMCard(presentationId, presentationTitle, changes, userEmail = 'unknown_user') {
    try {
      const now = new Date();
      
      // Create a human-readable summary of JSON editor changes
      const changesSummary = {
        type: 'google_slides_json_editor_summary',
        title: 'Google Slides JSON Editor Changes Summary',
        presentation: {
          id: presentationId,
          title: presentationTitle || 'Untitled Presentation'
        },
        editSession: {
          timestamp: now.toISOString(),
          timestampFormatted: `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`,
          user: userEmail,
          totalChanges: changes.length
        },
        changes: changes.length === 0 ? [] : changes.map((change, index) => ({
          changeNumber: index + 1,
          type: change.type,
          slideNumber: (change.slideIndex || 0) + 1,
          description: this.getChangeDescription(change),
          details: this.getChangeDetails(change)
        })),
        summary: {
          textChanges: changes.filter(c => c.type === 'replaceAllText').length,
          styleChanges: changes.filter(c => c.type === 'updateTextStyle').length,
          message: changes.length === 0 
            ? 'No changes were made in this JSON editor session.' 
            : `Successfully applied ${changes.length} change${changes.length === 1 ? '' : 's'} to the presentation.`
        },
        tips: [
          'JSON editor allows direct manipulation of presentation structure',
          'Changes are applied in real-time to Google Slides',
          'All edit sessions are automatically saved to MCard for reference'
        ],
        metadata: {
          source: 'google_slides_json_editor',
          format: 'summary',
          version: '1.0',
          generatedAt: now.toISOString()
        }
      };

      // Convert to formatted JSON
      const summaryJson = JSON.stringify(changesSummary, null, 2);

      // Save summary to MCard
      const response = await this.mcardService.storeContent(summaryJson);

      console.log(`✅ Saved JSON editor changes summary to MCard:`, response.hash);
      return response.hash;
    } catch (error) {
      console.error('❌ Failed to save JSON editor summary to MCard:', error);
      throw error;
    }
  }

  /**
   * Get human-readable description of a change
   */
  getChangeDescription(change) {
    switch (change.type) {
      case 'replaceAllText':
        return `Text content changed from "${change.originalText}" to "${change.newText}"`;
      case 'updateTextStyle':
        const styleChanges = [];
        if (change.style.foregroundColor !== change.originalStyle.foregroundColor) {
          styleChanges.push('color');
        }
        if (change.style.fontSize !== change.originalStyle.fontSize) {
          styleChanges.push('font size');
        }
        if (change.style.bold !== change.originalStyle.bold) {
          styleChanges.push(change.style.bold ? 'bold added' : 'bold removed');
        }
        if (change.style.italic !== change.originalStyle.italic) {
          styleChanges.push(change.style.italic ? 'italic added' : 'italic removed');
        }
        if (change.style.underline !== change.originalStyle.underline) {
          styleChanges.push(change.style.underline ? 'underline added' : 'underline removed');
        }
        return `Text style changed: ${styleChanges.join(', ')}`;
      default:
        return `Unknown change type: ${change.type}`;
    }
  }

  /**
   * Get detailed information about a change
   */
  getChangeDetails(change) {
    const details = {
      objectId: change.objectId,
      slideIndex: change.slideIndex,
      elementIndex: change.elementIndex
    };

    if (change.type === 'replaceAllText') {
      details.originalText = change.originalText;
      details.newText = change.newText;
    } else if (change.type === 'updateTextStyle') {
      details.styleChanges = change.style;
      details.originalStyle = change.originalStyle;
    }

    return details;
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
