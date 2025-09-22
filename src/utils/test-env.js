// Simple utility for testing environment variables
import { env } from './env';

// Function to display all available PUBLIC_ environment variables
export function displayEnvVars() {
  console.log('Environment Variables Test:');
  console.log('PUBLIC_AUTHENTIK_URL:', env.PUBLIC_AUTHENTIK_URL);
  console.log('PUBLIC_AUTHENTIK_CLIENT_ID:', env.PUBLIC_AUTHENTIK_CLIENT_ID);
  console.log('PUBLIC_AUTHENTIK_REDIRECT_URI:', env.PUBLIC_AUTHENTIK_REDIRECT_URI);
  console.log('PUBLIC_MCARD_API_URL:', env.PUBLIC_MCARD_API_URL);
}

// Export the env utility
export { env };
