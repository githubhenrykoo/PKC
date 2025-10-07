// Google Calendar API configuration
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events.readonly https://www.googleapis.com/auth/calendar.events';

// Dynamic credentials from runtime environment
let CLIENT_ID = '';
let API_KEY = '';
let CLIENT_SECRET = '';

let tokenClient;
let gapiInited = false;
let gisInited = false;

// Function to fetch credentials from runtime environment
const fetchRuntimeCredentials = async () => {
  try {
    const timestamp = Date.now();
    const response = await fetch(`/runtime-env.json?t=${timestamp}`, { 
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    if (response.ok) {
      const env = await response.json();
      CLIENT_ID = env.PUBLIC_GOOGLE_CLIENT_ID || '';
      API_KEY = env.PUBLIC_GOOGLE_API_KEY || '';
      CLIENT_SECRET = env.PUBLIC_GOOGLE_CLIENT_SECRET || '';
      
      console.log('🔑 Google Calendar credentials updated from runtime environment:', {
        hasApiKey: !!API_KEY,
        hasClientId: !!CLIENT_ID,
        hasClientSecret: !!CLIENT_SECRET,
        timestamp: new Date().toISOString()
      });
      
      return { CLIENT_ID, API_KEY, CLIENT_SECRET };
    } else {
      throw new Error(`Failed to fetch runtime environment: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Error fetching Google Calendar credentials from runtime environment:', error);
    // Fallback to import.meta.env if runtime fetch fails
    CLIENT_ID = import.meta.env.PUBLIC_GOOGLE_CLIENT_ID || '';
    API_KEY = import.meta.env.PUBLIC_GOOGLE_API_KEY || '';
    CLIENT_SECRET = import.meta.env.PUBLIC_GOOGLE_CLIENT_SECRET || '';
    
    console.warn('⚠️ Falling back to build-time environment variables');
    return { CLIENT_ID, API_KEY, CLIENT_SECRET };
  }
};

// Validate credentials
const validateCredentials = () => {
  const missing = [];
  if (!API_KEY) missing.push('PUBLIC_GOOGLE_API_KEY');
  if (!CLIENT_ID) missing.push('PUBLIC_GOOGLE_CLIENT_ID');
  if (!CLIENT_SECRET) missing.push('PUBLIC_GOOGLE_CLIENT_SECRET');
  
  if (missing.length > 0) {
    throw new Error(`Missing Google Calendar credentials: ${missing.join(', ')}. Please check your runtime environment configuration.`);
  }
  
  return true;
};

// Load the Google API client library
export const loadGoogleApi = async () => {
  try {
    console.log('Starting Google API initialization');
    
    // Check if we're in SSR (Server-Side Rendering)
    if (typeof window === 'undefined') {
      console.log('Skipping Google API initialization in SSR');
      return;
    }
    
    // First, fetch the latest credentials from runtime environment
    console.log('🔄 Fetching Google Calendar credentials from runtime environment...');
    await fetchRuntimeCredentials();
    
    // Validate that we have all required credentials
    validateCredentials();
    
    // Load the Google API client
    await new Promise((resolve, reject) => {
      if (window.gapi) {
        console.log('GAPI already loaded');
        resolve();
        return;
      }
      
      console.log('Loading GAPI script');
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        console.log('GAPI script loaded');
        resolve();
      };
      script.onerror = (e) => {
        console.error('Error loading GAPI script:', e);
        reject(new Error('Failed to load Google API script'));
      };
      document.head.appendChild(script);
    });

    // Initialize the gapi.client
    await new Promise((resolve, reject) => {
      console.log('Initializing GAPI client');
      window.gapi.load('client', {
        callback: () => {
          console.log('GAPI client loaded');
          resolve();
        },
        onerror: (e) => {
          console.error('Error loading GAPI client:', e);
          reject(new Error('Failed to load GAPI client'));
        },
        timeout: 5000,
        ontimeout: () => reject(new Error('GAPI client load timeout'))
      });
    });

    // Initialize gapi client
    console.log('Initializing GAPI client with API key');
    await window.gapi.client.init({
      apiKey: API_KEY,
      discoveryDocs: [DISCOVERY_DOC],
    });
    
    gapiInited = true;
    console.log('GAPI successfully initialized');

    // Load the Google Identity Service
    await new Promise((resolve, reject) => {
      if (window.google && window.google.accounts && window.google.accounts.oauth2) {
        console.log('GIS already loaded');
        resolve();
        return;
      }
      
      console.log('Loading GIS script');
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = () => {
        console.log('GIS script loaded');
        resolve();
      };
      script.onerror = (e) => {
        console.error('Error loading GIS script:', e);
        reject(new Error('Failed to load Google Identity Services script'));
      };
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    });

    // Wait for the Google Identity Services to be ready
    await new Promise((resolve, reject) => {
      console.log('Waiting for GIS to be ready');
      const maxAttempts = 50;
      let attempts = 0;
      
      const checkGisReady = () => {
        attempts++;
        if (window.google && window.google.accounts && window.google.accounts.oauth2) {
          console.log('GIS is ready');
          resolve();
        } else if (attempts >= maxAttempts) {
          reject(new Error('Timeout waiting for Google Identity Services to load'));
        } else {
          console.log(`Waiting for GIS (attempt ${attempts}/${maxAttempts})`);
          setTimeout(checkGisReady, 100);
        }
      };
      checkGisReady();
    });
    
    // Initialize token client with UX_MODE popup to handle COOP issues
    console.log('Initializing token client');
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      ux_mode: 'popup',
      prompt: '',
      callback: '', // We'll define this at sign-in time
    });
    
    gisInited = true;
    console.log('GIS successfully initialized');

  } catch (err) {
    console.error('Error loading Google API:', err);
    gapiInited = false;
    gisInited = false;
    throw new Error(`Failed to load Google Calendar API: ${err.message}`);
  }
};

// Check if the APIs are initialized
export const isInitialized = () => {
  return gapiInited && gisInited;
};

// Get auth instance - may return undefined if gapi auth2 isn't loaded
export const getAuthInstance = () => {
  return window.gapi.auth2?.getAuthInstance();
};

// Sign in
export const signIn = () => {
  if (!isInitialized()) {
    throw new Error('Google API not initialized');
  }

  return new Promise((resolve, reject) => {
    try {
      // Set the callback for token response
      tokenClient.callback = async (response) => {
        if (response.error) {
          console.error('OAuth error:', response.error, response.error_description);
          
          // Handle specific COOP-related errors
          if (response.error === 'popup_closed_by_user') {
            reject({ error: 'popup_closed_by_user', message: 'Sign-in popup was closed. Please try again.' });
          } else if (response.error === 'popup_blocked_by_browser') {
            reject({ error: 'popup_blocked_by_browser', message: 'Popup was blocked by browser. Please allow popups for this site.' });
          } else if (response.error === 'access_denied') {
            reject({ error: 'access_denied', message: 'Access was denied. Please grant calendar permissions.' });
          } else {
            reject({ error: response.error, message: response.error_description || 'Authentication failed' });
          }
          return;
        }
        
        try {
          // Set the token in gapi
          await window.gapi.client.setToken(response);
          console.log('Successfully signed in with token:', response.access_token ? 'present' : 'missing');
          resolve(response);
        } catch (err) {
          console.error('Error setting token:', err);
          reject(err);
        }
      };
      
      // Add error handling for COOP issues
      const originalRequestAccessToken = tokenClient.requestAccessToken.bind(tokenClient);
      
      try {
        // Request an access token
        if (window.gapi.client.getToken() === null) {
          console.log('First time sign-in, requesting consent');
          // First time requesting a token
          originalRequestAccessToken({ prompt: 'consent' });
        } else {
          console.log('Subsequent sign-in, no prompt needed');
          // Subsequent request - use no prompt
          originalRequestAccessToken({ prompt: '' });
        }
      } catch (popupError) {
        console.error('Popup error:', popupError);
        // Handle popup-related errors
        if (popupError.message && popupError.message.includes('Cross-Origin-Opener-Policy')) {
          reject({ 
            error: 'coop_policy_error', 
            message: 'Browser security policy blocked the sign-in. Please try refreshing the page or using a different browser.' 
          });
        } else {
          reject(popupError);
        }
      }
    } catch (err) {
      console.error('Sign in error:', err);
      reject(err);
    }
  });
};

// Sign out
export const signOut = async () => {
  if (!isInitialized()) {
    return;
  }
  
  const token = window.gapi.client.getToken();
  if (token !== null) {
    try {
      window.google.accounts.oauth2.revoke(token.access_token);
      window.gapi.client.setToken(null);
      console.log('Successfully signed out');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  }
};

// List all calendars the user has access to
export const listCalendars = async () => {
  if (!isInitialized()) {
    throw new Error('Google API not initialized');
  }
  
  // Check if we have a token
  if (!window.gapi.client.getToken()) {
    throw new Error('Not signed in', { status: 401 });
  }
  
  try {
    const response = await window.gapi.client.calendar.calendarList.list({
      'minAccessRole': 'reader'
    });
    
    console.log('Available calendars:', response.result.items?.length || 0);
    return response;
  } catch (err) {
    console.error('Error fetching calendars:', err);
    
    // Handle token expiration
    if (err.status === 401) {
      try {
        await signIn();
        return listCalendars(); // Try again after signing in
      } catch (refreshErr) {
        throw refreshErr;
      }
    }
    
    throw err;
  }
};

// List events from a specific calendar
export const listEventsFromCalendar = async (calendarId, maxResults = 50, daysInPast = 30, selectedDate = null, specificDate = false) => {
  if (!isInitialized()) {
    throw new Error('Google API not initialized');
  }
  
  // Check if we have a token
  if (!window.gapi.client.getToken()) {
    throw new Error('Not signed in', { status: 401 });
  }
  
  try {
    let timeMin, timeMax;
    
    if (selectedDate && specificDate) {
      // If a specific date is selected, get events for that day only
      timeMin = new Date(selectedDate);
      timeMin.setHours(0, 0, 0, 0);
      timeMax = new Date(selectedDate);
      timeMax.setHours(23, 59, 59, 999);
    } else if (selectedDate) {
      // If a specific date is selected, get events for that month
      timeMin = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      timeMax = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 23, 59, 59);
    } else {
      // Default behavior: get events from past days to future
      timeMin = new Date();
      timeMin.setDate(timeMin.getDate() - daysInPast);
      timeMin.setHours(0, 0, 0, 0);
    }
    
    const requestParams = {
      'calendarId': calendarId,
      'timeMin': timeMin.toISOString(),
      'showDeleted': false,
      'singleEvents': true,
      'maxResults': maxResults,
      'orderBy': 'startTime'
    };
    
    if (timeMax) {
      requestParams.timeMax = timeMax.toISOString();
    }
    
    const response = await window.gapi.client.calendar.events.list(requestParams);
    
    return response;
  } catch (err) {
    console.error(`Error fetching events from calendar ${calendarId}:`, err);
    
    // Handle token expiration
    if (err.status === 401) {
      try {
        await signIn();
        return listEventsFromCalendar(calendarId, maxResults, daysInPast, selectedDate, specificDate);
      } catch (refreshErr) {
        throw refreshErr;
      }
    }
    
    // Handle 403 Forbidden errors (no access to calendar or quota exceeded)
    if (err.status === 403) {
      // Check if it's a quota exceeded error
      if (err.body && err.body.includes('rateLimitExceeded')) {
        console.warn(`Quota exceeded for calendar ${calendarId}. Skipping to prevent authentication issues.`);
        return { result: { items: [] } };
      } else {
        console.warn(`Access denied to calendar ${calendarId}. User may not have permission to read events from this calendar.`);
        return { result: { items: [] } };
      }
    }
    
    // Don't throw for individual calendar errors - just return empty result
    const errorMessage = err.message || err.body || err.statusText || 'Unknown error';
    console.warn(`Skipping calendar ${calendarId} due to error (${err.status || 'unknown status'}):`, errorMessage);
    return { result: { items: [] } };
  }
};

// List calendar events from all accessible calendars
export const listEvents = async (selectedDate = null, specificDate = false) => {
  if (!isInitialized()) {
    throw new Error('Google API not initialized');
  }
  
  // Check if we have a token
  if (!window.gapi.client.getToken()) {
    throw new Error('Not signed in', { status: 401 });
  }
  
  try {
    // First, get all calendars
    const calendarsResponse = await listCalendars();
    const calendars = calendarsResponse.result.items || [];
    
    console.log(`Fetching events from ${calendars.length} calendars...`);
    
    // Fetch events from all calendars in parallel
    const eventPromises = calendars.map(async (calendar) => {
      try {
        const eventsResponse = await listEventsFromCalendar(calendar.id, 20, 30, selectedDate, specificDate); // Show events from selected date or last 30 days
        const events = eventsResponse.result.items || [];
        
        // Add calendar information to each event
        return events.map(event => ({
          ...event,
          calendarId: calendar.id,
          calendarName: calendar.summary,
          calendarColor: calendar.backgroundColor || calendar.colorId,
          isPrimary: calendar.primary || false
        }));
      } catch (err) {
        // More specific error handling for different error types
        if (err.status === 403) {
          console.warn(`Access denied to calendar "${calendar.summary}" (${calendar.id}). User may not have permission to read events.`);
        } else if (err.status === 404) {
          console.warn(`Calendar "${calendar.summary}" (${calendar.id}) not found. It may have been deleted or access revoked.`);
        } else {
          const errorMessage = err.message || err.body || err.statusText || 'Unknown error';
          console.warn(`Failed to fetch events from calendar "${calendar.summary}" (${calendar.id}):`, errorMessage);
        }
        return [];
      }
    });
    
    // Wait for all calendar event fetches to complete
    const allCalendarEvents = await Promise.all(eventPromises);
    
    // Flatten and merge all events
    const allEvents = allCalendarEvents.flat();
    
    // Sort events by start time
    allEvents.sort((a, b) => {
      const aTime = new Date(a.start.dateTime || a.start.date);
      const bTime = new Date(b.start.dateTime || b.start.date);
      return aTime - bTime;
    });
    
    // Count successful vs failed calendar fetches
    const successfulCalendars = allCalendarEvents.filter(events => events.length > 0).length;
    const totalCalendarsWithEvents = allCalendarEvents.filter(events => events.length >= 0).length;
    
    console.log(`Total events fetched: ${allEvents.length} from ${successfulCalendars}/${calendars.length} accessible calendars`);
    
    if (successfulCalendars < calendars.length) {
      const skippedCount = calendars.length - totalCalendarsWithEvents;
      if (skippedCount > 0) {
        console.info(`Note: ${skippedCount} calendar(s) were skipped due to access restrictions. This is normal for calendars you don't have read permission for.`);
      }
    }
    
    // Return in the same format as the original API
    return {
      result: {
        items: allEvents,
        summary: `Events from ${successfulCalendars}/${calendars.length} accessible calendars`
      }
    };
    
  } catch (err) {
    console.error('Error fetching events from all calendars:', err);
    
    // Handle quota exceeded errors - don't sign out the user
    if (err.status === 403 && err.body && err.body.includes('rateLimitExceeded')) {
      console.warn('Google Calendar API quota exceeded. Please wait a moment before trying again.');
      // Return empty result instead of throwing to prevent sign out
      return {
        result: {
          items: [],
          summary: 'Quota exceeded - please try again later'
        }
      };
    }
    
    // Handle token expiration
    if (err.status === 401) {
      try {
        await signIn();
        return listEvents(selectedDate, specificDate); // Try again after signing in
      } catch (refreshErr) {
        throw refreshErr;
      }
    }
    
    throw err;
  }
};

// Function to refresh credentials and reinitialize if needed
export const refreshCredentials = async () => {
  try {
    console.log('🔄 Refreshing Google Calendar credentials...');
    
    // Store current credentials for comparison
    const previousCredentials = { CLIENT_ID, API_KEY, CLIENT_SECRET };
    
    // Fetch new credentials
    await fetchRuntimeCredentials();
    
    // Check if credentials have changed
    const credentialsChanged = 
      previousCredentials.CLIENT_ID !== CLIENT_ID ||
      previousCredentials.API_KEY !== API_KEY ||
      previousCredentials.CLIENT_SECRET !== CLIENT_SECRET;
    
    if (credentialsChanged) {
      console.log('🔑 Google Calendar credentials have changed, reinitializing API...');
      
      // Reset initialization flags
      gapiInited = false;
      gisInited = false;
      tokenClient = null;
      
      // Sign out if currently signed in
      if (window.gapi && window.gapi.client && window.gapi.client.getToken()) {
        await signOut();
      }
      
      // Reinitialize with new credentials
      await loadGoogleApi();
      
      console.log('✅ Google Calendar API reinitialized with new credentials');
      
      // Dispatch custom event to notify components
      window.dispatchEvent(new CustomEvent('google-calendar-credentials-updated', {
        detail: {
          previousCredentials,
          newCredentials: { CLIENT_ID, API_KEY, CLIENT_SECRET },
          timestamp: new Date().toISOString()
        }
      }));
    } else {
      console.log('✅ Google Calendar credentials unchanged');
    }
    
    return credentialsChanged;
  } catch (error) {
    console.error('❌ Error refreshing Google Calendar credentials:', error);
    throw error;
  }
};

// Function to get current credentials (for debugging)
export const getCurrentCredentials = () => {
  return {
    CLIENT_ID,
    API_KEY,
    CLIENT_SECRET: CLIENT_SECRET ? '***' + CLIENT_SECRET.slice(-4) : '',
    hasApiKey: !!API_KEY,
    hasClientId: !!CLIENT_ID,
    hasClientSecret: !!CLIENT_SECRET
  };
};

// Function to check if credentials are valid
export const hasValidCredentials = () => {
  try {
    validateCredentials();
    return true;
  } catch (error) {
    return false;
  }
};

// Function to get credentials error message
export const getCredentialsError = () => {
  try {
    validateCredentials();
    return null;
  } catch (error) {
    return error.message;
  }
};

// Create a new calendar event
export const createEvent = async (eventData, calendarId = 'primary') => {
  if (!isInitialized()) {
    throw new Error('Google API not initialized');
  }
  
  // Check if we have a token
  if (!window.gapi.client.getToken()) {
    throw new Error('Not signed in', { status: 401 });
  }
  
  try {
    console.log('Creating new calendar event:', eventData);
    
    // Prepare the event object for Google Calendar API
    const event = {
      summary: eventData.title,
      location: eventData.location || '',
      description: eventData.description || '',
      start: {
        dateTime: eventData.startDateTime,
        timeZone: eventData.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: eventData.endDateTime,
        timeZone: eventData.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      attendees: eventData.attendees || [],
      reminders: {
        useDefault: eventData.useDefaultReminders !== false,
        overrides: eventData.reminders || []
      }
    };
    
    // Handle all-day events
    if (eventData.isAllDay) {
      delete event.start.dateTime;
      delete event.end.dateTime;
      event.start.date = eventData.startDate;
      event.end.date = eventData.endDate;
    }
    
    const response = await window.gapi.client.calendar.events.insert({
      calendarId: calendarId,
      resource: event
    });
    
    console.log('✅ Event created successfully:', response.result);
    return response;
    
  } catch (err) {
    console.error('❌ Error creating calendar event:', err);
    
    // Handle token expiration
    if (err.status === 401) {
      try {
        await signIn();
        return createEvent(eventData, calendarId); // Try again after signing in
      } catch (refreshErr) {
        throw refreshErr;
      }
    }
    
    // Handle permission errors
    if (err.status === 403) {
      throw new Error('Permission denied. You may not have write access to this calendar.');
    }
    
    throw err;
  }
};

// Update an existing calendar event
export const updateEvent = async (eventId, eventData, calendarId = 'primary') => {
  if (!isInitialized()) {
    throw new Error('Google API not initialized');
  }
  
  // Check if we have a token
  if (!window.gapi.client.getToken()) {
    throw new Error('Not signed in', { status: 401 });
  }
  
  try {
    console.log('Updating calendar event:', eventId, eventData);
    
    // Prepare the event object for Google Calendar API
    const event = {
      summary: eventData.title,
      location: eventData.location || '',
      description: eventData.description || '',
      start: {
        dateTime: eventData.startDateTime,
        timeZone: eventData.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: eventData.endDateTime,
        timeZone: eventData.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      attendees: eventData.attendees || [],
      reminders: {
        useDefault: eventData.useDefaultReminders !== false,
        overrides: eventData.reminders || []
      }
    };
    
    // Handle all-day events
    if (eventData.isAllDay) {
      delete event.start.dateTime;
      delete event.end.dateTime;
      event.start.date = eventData.startDate;
      event.end.date = eventData.endDate;
    }
    
    const response = await window.gapi.client.calendar.events.update({
      calendarId: calendarId,
      eventId: eventId,
      resource: event
    });
    
    console.log('✅ Event updated successfully:', response.result);
    return response;
    
  } catch (err) {
    console.error('❌ Error updating calendar event:', err);
    
    // Handle token expiration
    if (err.status === 401) {
      try {
        await signIn();
        return updateEvent(eventId, eventData, calendarId); // Try again after signing in
      } catch (refreshErr) {
        throw refreshErr;
      }
    }
    
    // Handle permission errors
    if (err.status === 403) {
      throw new Error('Permission denied. You may not have write access to this calendar.');
    }
    
    throw err;
  }
};

// Delete a calendar event
export const deleteEvent = async (eventId, calendarId = 'primary') => {
  if (!isInitialized()) {
    throw new Error('Google API not initialized');
  }
  
  // Check if we have a token
  if (!window.gapi.client.getToken()) {
    throw new Error('Not signed in', { status: 401 });
  }
  
  try {
    console.log('Deleting calendar event:', eventId);
    
    const response = await window.gapi.client.calendar.events.delete({
      calendarId: calendarId,
      eventId: eventId
    });
    
    console.log('✅ Event deleted successfully');
    return response;
    
  } catch (err) {
    console.error('❌ Error deleting calendar event:', err);
    
    // Handle token expiration
    if (err.status === 401) {
      try {
        await signIn();
        return deleteEvent(eventId, calendarId); // Try again after signing in
      } catch (refreshErr) {
        throw refreshErr;
      }
    }
    
    // Handle permission errors
    if (err.status === 403) {
      throw new Error('Permission denied. You may not have write access to this calendar.');
    }
    
    throw err;
  }
};

// Set up automatic credential refresh when runtime environment changes
if (typeof window !== 'undefined') {
  // Listen for runtime environment changes
  window.addEventListener('runtime-env-changed', async (event) => {
    console.log('🔄 Runtime environment changed, checking Google Calendar credentials...');
    try {
      await refreshCredentials();
    } catch (error) {
      console.error('❌ Failed to refresh Google Calendar credentials after environment change:', error);
    }
  });
  
  console.log('👂 Google Calendar: Listening for runtime environment changes');
}
