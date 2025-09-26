/**
 * Google Calendar MCard Integration Service (JavaScript version for browser compatibility)
 * Handles saving Google Calendar events to MCard Service
 */

import * as yaml from 'js-yaml';

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

  async storeContent(content, options = {}) {
    try {
      const { isYaml = false, filename = 'data' } = options;
      const formData = new FormData();
      
      // Convert to YAML if requested
      let contentToStore = content;
      let finalFilename = filename;
      
      if (isYaml && typeof content === 'object') {
        contentToStore = yaml.dump(content, { lineWidth: -1 });
        finalFilename = `${filename}.yaml`;
      } else if (isYaml) {
        // If it's already a string, assume it's JSON that needs YAML conversion
        try {
          const jsonContent = JSON.parse(content);
          contentToStore = yaml.dump(jsonContent, { lineWidth: -1 });
          finalFilename = `${filename}.yaml`;
        } catch (e) {
          console.warn('Content is not valid JSON, storing as-is');
          contentToStore = content;
        }
      } else if (typeof content === 'object') {
        contentToStore = JSON.stringify(content, null, 2);
        finalFilename = `${filename}.json`;
      }
      
      formData.append('content', contentToStore);
      if (finalFilename) {
        formData.append('filename', finalFilename);
      }
      
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
      console.log(`✅ Content stored successfully: ${result.hash} (${isYaml ? 'YAML' : 'JSON'})`);
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
      // Filter out birthday events (system-generated)
      if (this.isBirthdayEvent(event)) {
        console.log(`🚫 Skipping birthday event: "${event.summary}"`);
        return null;
      }

      // Create a clean event document with only essential information
      const eventDocument = {
        id: event.id,
        summary: event.summary,
        description: event.description || '',
        start: event.start,
        end: event.end
      };

      // Save to MCard as YAML
      const response = await this.mcardService.storeContent(eventDocument, {
        isYaml: true,
        filename: `calendar-event-${event.summary.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`
      });

      console.log(`✅ Saved event "${event.summary}" to MCard:`, response.hash);
      return response.hash;
    } catch (error) {
      console.error(`❌ Failed to save event "${event.summary}" to MCard:`, error);
      throw error;
    }
  }

  /**
   * Check if an event is a birthday event (system-generated)
   */
  isBirthdayEvent(event) {
    const summary = event.summary?.toLowerCase() || '';
    const description = event.description?.toLowerCase() || '';
    
    // Check for birthday indicators
    const birthdayKeywords = ['happy birthday', 'birthday', 'born on this day'];
    const isBirthday = birthdayKeywords.some(keyword => 
      summary.includes(keyword) || description.includes(keyword)
    );
    
    // Also check if it's a recurring event with birthday pattern
    const hasRecurringBirthdayPattern = event.id && event.id.includes('_202') && summary.includes('birthday');
    
    return isBirthday || hasRecurringBirthdayPattern;
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

      // Save summary to MCard as YAML
      const response = await this.mcardService.storeContent(summary, {
        isYaml: true,
        filename: 'calendar-summary'
      });

      console.log(`✅ Saved calendar summary (${events.length} events) to MCard:`, response.hash);
      return response.hash;
    } catch (error) {
      console.error('❌ Failed to save calendar summary to MCard:', error);
      throw error;
    }
  }

  /**
   * Save all events to MCard (individual events only, no summaries)
   */
  async saveAllEventsToMCard(events, userEmail = 'unknown_user') {
    console.log(`🔄 Starting to save ${events.length} Google Calendar events to MCard...`);

    const eventHashes = [];
    const savedEventIds = new Set(); // Track saved events to prevent duplicates
    let savedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    // Filter out birthday events first
    const filteredEvents = events.filter(event => !this.isBirthdayEvent(event));
    console.log(`📋 Filtered ${events.length} events, ${filteredEvents.length} remaining after removing birthdays`);

    // Save individual events only
    for (const event of filteredEvents) {
      try {
        // Check for duplicates based on event ID
        if (savedEventIds.has(event.id)) {
          console.log(`🔄 Skipping duplicate event: "${event.summary}" (${event.id})`);
          skippedCount++;
          continue;
        }

        const hash = await this.saveEventToMCard(event);
        if (hash) { // hash will be null if event was skipped (e.g., birthday)
          eventHashes.push(hash);
          savedEventIds.add(event.id);
          savedCount++;
        } else {
          skippedCount++;
        }
      } catch (error) {
        console.warn(`Failed to save event ${event.id}:`, error);
        failedCount++;
      }
    }

    console.log(`✅ MCard sync complete: ${savedCount} events saved, ${skippedCount} skipped, ${failedCount} failed`);

    return {
      eventHashes,
      savedCount,
      skippedCount,
      failedCount,
      totalProcessed: filteredEvents.length
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
   * Create a readable JSON summary of calendar events
   */
  async saveReadableSummaryToMCard(events, userEmail = 'unknown_user') {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const oneWeekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Filter today's events
      const todayEvents = events.filter(event => {
        const eventDate = new Date(event.start.dateTime || event.start.date || '');
        const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
        return eventDay.getTime() === today.getTime();
      });

      // Filter this week's events
      const weekEvents = events.filter(event => {
        const eventDate = new Date(event.start.dateTime || event.start.date || '');
        return eventDate >= today && eventDate <= oneWeekFromNow;
      });

      // Create structured JSON summary
      const readableSummary = {
        type: 'google_calendar_readable_summary',
        title: 'Google Calendar Summary',
        syncInfo: {
          syncDate: now.toISOString(),
          syncDateFormatted: `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`,
          user: userEmail,
          totalEvents: events.length
        },
        todayEvents: {
          title: "Today's Events",
          count: todayEvents.length,
          date: today.toISOString(),
          dateFormatted: today.toLocaleDateString(),
          events: todayEvents.length === 0 ? [] : todayEvents.map((event, index) => {
            const startTime = new Date(event.start.dateTime || event.start.date || '');
            const endTime = new Date(event.end.dateTime || event.end.date || '');
            return {
              index: index + 1,
              summary: event.summary,
              id: event.id,
              startTime: startTime.toISOString(),
              endTime: endTime.toISOString(),
              startTimeFormatted: startTime.toLocaleTimeString(),
              endTimeFormatted: endTime.toLocaleTimeString(),
              location: event.location || '',
              description: event.description ? 
                (event.description.length > 100 ? 
                  event.description.substring(0, 100) + '...' : 
                  event.description) : '',
              status: event.status || 'confirmed',
              htmlLink: event.htmlLink || '',
              attendees: event.attendees?.map(attendee => ({
                email: attendee.email,
                displayName: attendee.displayName,
                responseStatus: attendee.responseStatus
              })) || []
            };
          }),
          message: todayEvents.length === 0 ? 'No meetings today - perfect day for deep work! 🎯' : null
        },
        weekEvents: {
          title: 'This Week\'s Events',
          count: weekEvents.length,
          timeframe: 'Next 7 days',
          events: weekEvents.slice(0, 15).map((event, index) => {
            const startDate = new Date(event.start.dateTime || event.start.date || '');
            const endDate = new Date(event.end.dateTime || event.end.date || '');
            return {
              index: index + 1,
              summary: event.summary,
              id: event.id,
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
              startDateFormatted: `${startDate.toLocaleDateString()} ${startDate.toLocaleTimeString()}`,
              location: event.location || '',
              status: event.status || 'confirmed',
              htmlLink: event.htmlLink || ''
            };
          })
        },
        upcomingEvents: {
          title: 'Upcoming Events (Next 10)',
          count: Math.min(events.length, 10),
          events: events.slice(0, 10).map((event, index) => {
            const startDate = new Date(event.start.dateTime || event.start.date || '');
            return {
              index: index + 1,
              summary: event.summary,
              id: event.id,
              startDate: startDate.toISOString(),
              startDateFormatted: `${startDate.toLocaleDateString()} ${startDate.toLocaleTimeString()}`,
              location: event.location || '',
              status: event.status || 'confirmed',
              htmlLink: event.htmlLink || ''
            };
          })
        },
        tips: [
          'Use these events to plan your day effectively',
          'Click the HTML links to view events in Google Calendar',
          'Check attendee status for meeting preparation',
          'Review locations for travel planning'
        ],
        metadata: {
          source: 'google_calendar',
          format: 'yaml',
          version: '1.0',
          generatedAt: now.toISOString()
        }
      };

      // Save readable summary as YAML
      const response = await this.mcardService.storeContent(readableSummary, {
        isYaml: true,
        filename: 'readable-calendar-summary'
      });

      console.log(`✅ Saved readable calendar summary (JSON format) to MCard:`, response.hash);
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
