/**
 * Google Calendar MCard Integration Service
 * Handles saving Google Calendar events to MCard Service
 */

import defaultMCardService from './MCardService';

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  creator?: {
    email: string;
    displayName?: string;
  };
  organizer?: {
    email: string;
    displayName?: string;
  };
  status?: string;
  htmlLink?: string;
  created?: string;
  updated?: string;
}

export interface SimplifiedCalendarEvent {
  id: string;
  summary: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  status?: string;
}

export interface CalendarEventsSummary {
  totalEvents: number;
  todayEvents: SimplifiedCalendarEvent[];
  weekEvents: SimplifiedCalendarEvent[];
  monthEvents: SimplifiedCalendarEvent[];
  upcomingEvents: SimplifiedCalendarEvent[];
  lastSyncTime: string;
  syncedBy: string;
}

export class GoogleCalendarMCardService {
  private mcardService: typeof defaultMCardService;

  constructor() {
    this.mcardService = defaultMCardService;
  }

  /**
   * Save individual calendar event to MCard
   */
  async saveEventToMCard(event: CalendarEvent): Promise<string> {
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

      // Save to MCard with descriptive filename
      const eventDate = new Date(event.start.dateTime || event.start.date || '');
      const dateStr = eventDate.toISOString().split('T')[0];
      const filename = `google_calendar_event_${event.id}_${dateStr}.json`;

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
  async saveEventsSummaryToMCard(events: CalendarEvent[], userEmail?: string): Promise<string> {
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
      const summary: CalendarEventsSummary = {
        totalEvents: events.length,
        todayEvents: todayEvents.map(this.simplifyEvent),
        weekEvents: weekEvents.map(this.simplifyEvent),
        monthEvents: monthEvents.map(this.simplifyEvent),
        upcomingEvents: events.slice(0, 10).map(this.simplifyEvent), // Next 10 events
        lastSyncTime: now.toISOString(),
        syncedBy: userEmail || 'unknown_user'
      };

      // Convert to formatted JSON
      const summaryJson = JSON.stringify(summary, null, 2);

      // Save summary to MCard
      const filename = `google_calendar_summary_${now.toISOString().split('T')[0]}.json`;
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
  async saveAllEventsToMCard(events: CalendarEvent[], userEmail?: string): Promise<{
    summaryHash: string;
    eventHashes: string[];
    savedCount: number;
    failedCount: number;
  }> {
    console.log(`🔄 Starting to save ${events.length} Google Calendar events to MCard...`);

    const eventHashes: string[] = [];
    let savedCount = 0;
    let failedCount = 0;

    // Save individual events (limit to recent/important ones to avoid overwhelming MCard)
    const eventsToSave = events.slice(0, 50); // Save up to 50 most recent events
    
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

    console.log(`✅ MCard sync complete: ${savedCount} events saved, ${failedCount} failed, summary saved`);

    return {
      summaryHash,
      eventHashes,
      savedCount,
      failedCount
    };
  }

  /**
   * Simplify event object for summary
   */
  private simplifyEvent(event: CalendarEvent): SimplifiedCalendarEvent {
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
  async saveReadableSummaryToMCard(events: CalendarEvent[], userEmail?: string): Promise<string> {
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
      summary += `**User:** ${userEmail || 'Unknown'}\n`;
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
      const filename = `google_calendar_readable_summary_${now.toISOString().split('T')[0]}.md`;
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
  async getMCardStatus(): Promise<boolean> {
    try {
      // Use a simple test to check if MCard service is working
      await this.mcardService.listCards(1, 1);
      return true;
    } catch (error) {
      console.error('MCard service health check failed:', error);
      return false;
    }
  }
}

// Export default instance
export const googleCalendarMCardService = new GoogleCalendarMCardService();
