/**
 * Google Calendar MCard Integration Service (JavaScript version for browser compatibility)
 * Handles saving Google Calendar events to MCard Service
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

// Google Calendar MCard Service
class GoogleCalendarMCardService {
  constructor() {
    this.mcardService = new BrowserMCardService();
  }

  /**
   * Save individual calendar event to MCard
   */
  async saveEventToMCard(event) {
    try {
      // Create a structured event document
      const eventDocument = {
        type: 'google_calendar_event',
        eventId: event.id,
        summary: event.summary,
        description: event.description || '',
        start: event.start,
        end: event.end,
        location: event.location || '',
        attendees: event.attendees || [],
        creator: event.creator,
        organizer: event.organizer,
        status: event.status || 'confirmed',
        htmlLink: event.htmlLink || '',
        created: event.created || new Date().toISOString(),
        updated: event.updated || new Date().toISOString(),
        savedToMCard: new Date().toISOString(),
        source: 'google_calendar'
      };

      // Convert to JSON string for storage
      const eventJson = JSON.stringify(eventDocument, null, 2);

      // Save to MCard
      const response = await this.mcardService.storeContent(eventJson);

      console.log(`✅ Saved event "${event.summary}" to MCard:`, response.hash);
      return response.hash;
    } catch (error) {
      console.error(`❌ Failed to save event "${event.summary}" to MCard:`, error);
      throw error;
    }
  }

  /**
   * Save calendar events summary to MCard
   */
  async saveEventsSummaryToMCard(events, userEmail = 'unknown_user') {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const oneWeekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const oneMonthFromNow = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());

      // Filter events by time periods
      const todayEvents = events.filter(event => {
        const eventDate = new Date(event.start.dateTime || event.start.date || '');
        const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
        return eventDay.getTime() === today.getTime();
      });

      const weekEvents = events.filter(event => {
        const eventDate = new Date(event.start.dateTime || event.start.date || '');
        return eventDate >= today && eventDate <= oneWeekFromNow;
      });

      const monthEvents = events.filter(event => {
        const eventDate = new Date(event.start.dateTime || event.start.date || '');
        return eventDate >= today && eventDate <= oneMonthFromNow;
      });

      // Create summary document
      const summary = {
        type: 'google_calendar_summary',
        totalEvents: events.length,
        todayEvents: todayEvents.map(this.simplifyEvent),
        weekEvents: weekEvents.map(this.simplifyEvent),
        monthEvents: monthEvents.map(this.simplifyEvent),
        upcomingEvents: events.slice(0, 10).map(this.simplifyEvent), // Next 10 events
        lastSyncTime: now.toISOString(),
        syncedBy: userEmail,
        source: 'google_calendar'
      };

      // Convert to formatted JSON
      const summaryJson = JSON.stringify(summary, null, 2);

      // Save summary to MCard
      const response = await this.mcardService.storeContent(summaryJson);

      console.log(`✅ Saved calendar summary (${events.length} events) to MCard:`, response.hash);
      return response.hash;
    } catch (error) {
      console.error('❌ Failed to save calendar summary to MCard:', error);
      throw error;
    }
  }

  /**
   * Save all events to MCard (both individual events and summary)
   */
  async saveAllEventsToMCard(events, userEmail = 'unknown_user') {
    console.log(`🔄 Starting to save ${events.length} Google Calendar events to MCard...`);

    const eventHashes = [];
    let savedCount = 0;
    let failedCount = 0;

    // Save individual events (limit to recent/important ones to avoid overwhelming MCard)
    const eventsToSave = events.slice(0, 20); // Save up to 20 most recent events
    
    for (const event of eventsToSave) {
      try {
        const hash = await this.saveEventToMCard(event);
        eventHashes.push(hash);
        savedCount++;
      } catch (error) {
        console.warn(`Failed to save event ${event.id}:`, error);
        failedCount++;
      }
    }

    // Save summary (always save this)
    const summaryHash = await this.saveEventsSummaryToMCard(events, userEmail);

    // Also save a readable summary
    const readableHash = await this.saveReadableSummaryToMCard(events, userEmail);

    console.log(`✅ MCard sync complete: ${savedCount} events saved, ${failedCount} failed, summary saved`);

    return {
      summaryHash,
      readableHash,
      eventHashes,
      savedCount,
      failedCount
    };
  }

  /**
   * Simplify event object for summary
   */
  simplifyEvent(event) {
    return {
      id: event.id,
      summary: event.summary,
      start: event.start,
      end: event.end,
      location: event.location,
      status: event.status
    };
  }

  /**
   * Create a readable text summary of calendar events
   */
  async saveReadableSummaryToMCard(events, userEmail = 'unknown_user') {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Filter today's events
      const todayEvents = events.filter(event => {
        const eventDate = new Date(event.start.dateTime || event.start.date || '');
        const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
        return eventDay.getTime() === today.getTime();
      });

      // Create readable summary
      let summary = `# Google Calendar Summary\n\n`;
      summary += `**Sync Date:** ${now.toLocaleDateString()} ${now.toLocaleTimeString()}\n`;
      summary += `**User:** ${userEmail}\n`;
      summary += `**Total Events:** ${events.length}\n\n`;

      // Today's events
      summary += `## Today's Events (${todayEvents.length})\n\n`;
      if (todayEvents.length === 0) {
        summary += `No meetings today - perfect day for deep work! 🎯\n\n`;
      } else {
        todayEvents.forEach((event, index) => {
          const startTime = new Date(event.start.dateTime || event.start.date || '');
          const endTime = new Date(event.end.dateTime || event.end.date || '');
          
          summary += `${index + 1}. **${event.summary}**\n`;
          summary += `   - Time: ${startTime.toLocaleTimeString()} - ${endTime.toLocaleTimeString()}\n`;
          if (event.location) {
            summary += `   - Location: ${event.location}\n`;
          }
          if (event.description) {
            summary += `   - Description: ${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''}\n`;
          }
          summary += `\n`;
        });
      }

      // Upcoming events (next 10)
      const upcomingEvents = events.slice(0, 10);
      summary += `## Upcoming Events (Next 10)\n\n`;
      upcomingEvents.forEach((event, index) => {
        const startDate = new Date(event.start.dateTime || event.start.date || '');
        summary += `${index + 1}. **${event.summary}** - ${startDate.toLocaleDateString()} ${startDate.toLocaleTimeString()}\n`;
      });

      // Save readable summary
      const response = await this.mcardService.storeContent(summary);

      console.log(`✅ Saved readable calendar summary to MCard:`, response.hash);
      return response.hash;
    } catch (error) {
      console.error('❌ Failed to save readable calendar summary to MCard:', error);
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
export const googleCalendarMCardService = new GoogleCalendarMCardService();
export default googleCalendarMCardService;
