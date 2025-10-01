// Google Slides API configuration
const SCOPES = 'https://www.googleapis.com/auth/presentations https://www.googleapis.com/auth/drive';

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
      
      console.log('🔑 Google Slides credentials updated from runtime environment:', {
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
    console.error('❌ Error fetching Google Slides credentials from runtime environment:', error);
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
    throw new Error(`Missing Google Slides credentials: ${missing.join(', ')}. Please check your runtime environment configuration.`);
  }
  
  return true;
};

// Load the Google API client library
export const loadGoogleApi = async () => {
  try {
    console.log('Starting Google Slides API initialization');
    
    // Check if we're in SSR (Server-Side Rendering)
    if (typeof window === 'undefined') {
      console.log('Skipping Google Slides API initialization in SSR');
      return;
    }
    
    // First, fetch the latest credentials from runtime environment
    console.log('🔄 Fetching Google Slides credentials from runtime environment...');
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
    });

    // Load APIs individually for better reliability
    console.log('Loading Google Drive API...');
    try {
      await window.gapi.client.load('drive', 'v3');
      console.log('Google Drive API loaded successfully');
    } catch (error) {
      console.error('Failed to load Google Drive API:', error);
      throw new Error('Failed to load Google Drive API. Please ensure it is enabled in Google Cloud Console.');
    }
    
    console.log('Loading Google Slides API...');
    try {
      await window.gapi.client.load('slides', 'v1');
      console.log('Google Slides API loaded successfully');
    } catch (error) {
      console.error('Failed to load Google Slides API:', error);
      throw new Error('Failed to load Google Slides API. Please ensure it is enabled in Google Cloud Console.');
    }
    
    // Verify APIs are loaded correctly
    if (!window.gapi.client.drive || !window.gapi.client.slides) {
      throw new Error('Google APIs failed to load properly. Please check your API credentials and ensure the APIs are enabled.');
    }
    
    gapiInited = true;
    console.log('GAPI successfully initialized with Drive and Slides APIs');

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
    console.error('Error loading Google Slides API:', err);
    gapiInited = false;
    gisInited = false;
    throw new Error(`Failed to load Google Slides API: ${err.message}`);
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
    throw new Error('Google Slides API not initialized');
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
            reject({ error: 'access_denied', message: 'Access was denied. Please grant Google Slides permissions.' });
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

// List Google Slides presentations
export const listPresentations = async () => {
  if (!isInitialized()) {
    throw new Error('Google Slides API not initialized');
  }
  
  // Check if we have a token
  if (!window.gapi.client.getToken()) {
    throw new Error('Not signed in', { status: 401 });
  }
  
  try {
    // Use Google Drive API to find presentation files
    const response = await window.gapi.client.drive.files.list({
      q: "mimeType='application/vnd.google-apps.presentation'",
      pageSize: 50,
      fields: 'files(id,name,createdTime,modifiedTime,webViewLink,thumbnailLink)',
      orderBy: 'modifiedTime desc'
    });
    
    return response;
  } catch (err) {
    console.error('Error fetching presentations:', err);
    
    // Handle specific error cases
    if (err.status === 401) {
      // Token expired, try to refresh
      try {
        await signIn();
        return listPresentations(); // Try again after signing in
      } catch (refreshErr) {
        throw refreshErr;
      }
    } else if (err.status === 403) {
      // Insufficient permissions or API not enabled
      const errorMessage = err.result?.error?.message || 'Insufficient permissions';
      if (errorMessage.includes('insufficient authentication scopes')) {
        throw new Error('Please sign out and sign in again to grant the necessary permissions for Google Drive access.');
      } else if (errorMessage.includes('Drive API has not been used')) {
        throw new Error('Google Drive API is not enabled. Please enable it in the Google Cloud Console.');
      } else {
        throw new Error(`Permission denied: ${errorMessage}`);
      }
    }
    
    throw err;
  }
};

// Get presentation details
export const getPresentation = async (presentationId) => {
  if (!isInitialized()) {
    throw new Error('Google Slides API not initialized');
  }
  
  // Check if we have a token
  if (!window.gapi.client.getToken()) {
    throw new Error('Not signed in', { status: 401 });
  }
  
  try {
    const response = await window.gapi.client.slides.presentations.get({
      presentationId: presentationId
    });
    
    return response;
  } catch (err) {
    console.error('Error fetching presentation details:', err);
    
    // Handle token expiration
    if (err.status === 401) {
      try {
        await signIn();
        return getPresentation(presentationId); // Try again after signing in
      } catch (refreshErr) {
        throw refreshErr;
      }
    }
    
    throw err;
  }
};

// Get presentation thumbnail
export const getPresentationThumbnail = async (presentationId, slideIndex = 0) => {
  if (!isInitialized()) {
    throw new Error('Google Slides API not initialized');
  }
  
  // Check if we have a token
  if (!window.gapi.client.getToken()) {
    throw new Error('Not signed in', { status: 401 });
  }
  
  try {
    const response = await window.gapi.client.slides.presentations.pages.getThumbnail({
      presentationId: presentationId,
      pageObjectId: slideIndex.toString(),
      'thumbnailProperties.mimeType': 'PNG',
      'thumbnailProperties.thumbnailSize': 'MEDIUM'
    });
    
    return response;
  } catch (err) {
    console.error('Error fetching presentation thumbnail:', err);
    throw err;
  }
};

// Create a new presentation
export const createPresentation = async (title = 'Untitled Presentation') => {
  if (!isInitialized()) {
    throw new Error('Google Slides API not initialized');
  }
  
  try {
    const response = await window.gapi.client.slides.presentations.create({
      title: title
    });
    
    console.log('Created presentation:', response.result);
    return response.result;
  } catch (err) {
    console.error('Error creating presentation:', err);
    throw err;
  }
};

// Update slide text content
export const updateSlideText = async (presentationId, slideId, textContent, objectId = null) => {
  if (!isInitialized()) {
    throw new Error('Google Slides API not initialized');
  }
  
  try {
    // If no objectId provided, find the first text box on the slide
    if (!objectId) {
      const presentation = await getPresentation(presentationId);
      const slide = presentation.slides.find(s => s.objectId === slideId);
      if (slide && slide.pageElements) {
        const textElement = slide.pageElements.find(el => el.shape && el.shape.text);
        if (textElement) {
          objectId = textElement.objectId;
        }
      }
    }
    
    if (!objectId) {
      throw new Error('No text element found on slide');
    }
    
    const requests = [{
      deleteText: {
        objectId: objectId,
        textRange: {
          type: 'ALL'
        }
      }
    }, {
      insertText: {
        objectId: objectId,
        text: textContent,
        insertionIndex: 0
      }
    }];
    
    const response = await window.gapi.client.slides.presentations.batchUpdate({
      presentationId: presentationId,
      requests: requests
    });
    
    console.log('Updated slide text:', response.result);
    return response.result;
  } catch (err) {
    console.error('Error updating slide text:', err);
    throw err;
  }
};

// Add a new slide to presentation
export const addSlide = async (presentationId, layoutId = 'BLANK') => {
  if (!isInitialized()) {
    throw new Error('Google Slides API not initialized');
  }
  
  try {
    const slideId = 'slide_' + Date.now();
    
    const requests = [{
      createSlide: {
        objectId: slideId,
        slideLayoutReference: {
          predefinedLayout: layoutId
        }
      }
    }];
    
    const response = await window.gapi.client.slides.presentations.batchUpdate({
      presentationId: presentationId,
      requests: requests
    });
    
    console.log('Added new slide:', response.result);
    return response.result;
  } catch (err) {
    console.error('Error adding slide:', err);
    throw err;
  }
};

// Delete a slide from presentation
export const deleteSlide = async (presentationId, slideId) => {
  if (!isInitialized()) {
    throw new Error('Google Slides API not initialized');
  }
  
  try {
    const requests = [{
      deleteObject: {
        objectId: slideId
      }
    }];
    
    const response = await window.gapi.client.slides.presentations.batchUpdate({
      presentationId: presentationId,
      requests: requests
    });
    
    console.log('Deleted slide:', response.result);
    return response.result;
  } catch (err) {
    console.error('Error deleting slide:', err);
    throw err;
  }
};

// Add text box to slide
export const addTextBox = async (presentationId, slideId, text, x = 100, y = 100, width = 300, height = 100) => {
  if (!isInitialized()) {
    throw new Error('Google Slides API not initialized');
  }
  
  try {
    const textBoxId = 'textbox_' + Date.now();
    
    const requests = [{
      createShape: {
        objectId: textBoxId,
        shapeType: 'TEXT_BOX',
        elementProperties: {
          pageObjectId: slideId,
          size: {
            width: {
              magnitude: width,
              unit: 'PT'
            },
            height: {
              magnitude: height,
              unit: 'PT'
            }
          },
          transform: {
            scaleX: 1,
            scaleY: 1,
            translateX: x,
            translateY: y,
            unit: 'PT'
          }
        }
      }
    }, {
      insertText: {
        objectId: textBoxId,
        text: text
      }
    }];
    
    const response = await window.gapi.client.slides.presentations.batchUpdate({
      presentationId: presentationId,
      requests: requests
    });
    
    console.log('Added text box:', response.result);
    return response.result;
  } catch (err) {
    console.error('Error adding text box:', err);
    throw err;
  }
};

// Add image to slide
export const addImage = async (presentationId, slideId, imageUrl, x = 100, y = 100, width = 300, height = 200) => {
  if (!isInitialized()) {
    throw new Error('Google Slides API not initialized');
  }
  
  try {
    const imageId = 'image_' + Date.now();
    
    const requests = [{
      createImage: {
        objectId: imageId,
        url: imageUrl,
        elementProperties: {
          pageObjectId: slideId,
          size: {
            width: {
              magnitude: width,
              unit: 'PT'
            },
            height: {
              magnitude: height,
              unit: 'PT'
            }
          },
          transform: {
            scaleX: 1,
            scaleY: 1,
            translateX: x,
            translateY: y,
            unit: 'PT'
          }
        }
      }
    }];
    
    const response = await window.gapi.client.slides.presentations.batchUpdate({
      presentationId: presentationId,
      requests: requests
    });
    
    console.log('Added image:', response.result);
    return response.result;
  } catch (err) {
    console.error('Error adding image:', err);
    throw err;
  }
};

// Function to refresh credentials and reinitialize if needed
export const refreshCredentials = async () => {
  try {
    console.log('🔄 Refreshing Google Slides credentials...');
    
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
      console.log('🔑 Google Slides credentials have changed, reinitializing API...');
      
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
      
      console.log('✅ Google Slides API reinitialized with new credentials');
      
      // Dispatch custom event to notify components
      window.dispatchEvent(new CustomEvent('google-slides-credentials-updated', {
        detail: {
          previousCredentials,
          newCredentials: { CLIENT_ID, API_KEY, CLIENT_SECRET },
          timestamp: new Date().toISOString()
        }
      }));
    } else {
      console.log('✅ Google Slides credentials unchanged');
    }
    
    return credentialsChanged;
  } catch (error) {
    console.error('❌ Error refreshing Google Slides credentials:', error);
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

// Set up automatic credential refresh when runtime environment changes
if (typeof window !== 'undefined') {
  // Listen for runtime environment changes
  window.addEventListener('runtime-env-changed', async (event) => {
    console.log('🔄 Runtime environment changed, checking Google Slides credentials...');
    try {
      await refreshCredentials();
    } catch (error) {
      console.error('❌ Failed to refresh Google Slides credentials after environment change:', error);
    }
  });
  
  console.log('👂 Google Slides: Listening for runtime environment changes');
}
