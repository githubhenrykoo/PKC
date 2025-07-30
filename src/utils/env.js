/**
 * Environment variable utility for PKC application
 * This provides a unified interface for accessing environment variables in both
 * development and production environments, including Docker containers.
 */
import { createEnv } from './env-utils';

// Create the environment variable accessor
const env = createEnv();

// Export the environment accessor
export { env };

// Default export for convenience
export default env;
