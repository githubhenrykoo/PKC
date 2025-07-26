/**
 * Application configuration
 * This centralizes all configuration settings for the application
 */

// Use the PUBLIC_MCARD_API_URL environment variable if available,
// otherwise fall back to the development API URL
export const MCARD_API_URL = 
  (typeof import.meta !== 'undefined' && 
   typeof import.meta.env !== 'undefined' && 
   import.meta.env.PUBLIC_MCARD_API_URL) 
    ? import.meta.env.PUBLIC_MCARD_API_URL 
    : 'https://devmcard.pkc.pub/v1';

// Log the selected API URL during initialization
console.log('MCARD_API_URL configured as:', MCARD_API_URL);
