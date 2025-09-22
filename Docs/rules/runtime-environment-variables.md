5# Runtime Environment Variables System

## Overview

This document outlines the architecture and usage of runtime environment variables in the PKC application. The system is designed to securely manage configuration values that can be modified without requiring a rebuild of the application.

## Core Concepts

1. **Runtime vs Build-time Variables**
   - Runtime variables are loaded when the application runs in the browser
   - No rebuild required when values change
   - Sensitive values can be injected by the deployment environment

2. **Variable Sources (in order of precedence)**
   1. `runtime-env.json` - Loaded from the server at runtime
   2. Default values - Hardcoded in `runtime-env.ts`

## Implementation Details

### File Structure

```
src/
  utils/
    runtime-env.ts    # Core runtime environment implementation
  types/
    global.d.ts       # TypeScript type definitions
public/
  runtime-env.json    # Generated during build (not in version control)
  runtime-env.js      # Client-side loader (optional)
```

### Type Safety

All environment variables are strictly typed through the `RuntimeEnv` interface:

```typescript
interface RuntimeEnv {
  // Core configuration
  PUBLIC_API_URL: string;
  
  // Authentication
  PUBLIC_AUTH_URL: string;
  PUBLIC_AUTHENTIK_URL: string;
  PUBLIC_AUTHENTIK_CLIENT_ID: string;
  PUBLIC_AUTHENTIK_CLIENT_SECRET: string;
  PUBLIC_AUTHENTIK_REDIRECT_URI: string;
  
  // MCard API
  PUBLIC_MCARD_API_URL: string;
  
  // Feature flags
  ENABLE_EXPERIMENTAL_FEATURES: string;
  
  // Version info
  VERSION: string;
  BUILD_TIMESTAMP: string;
}
```

## Usage in Application

### Initialization

Initialize the runtime environment in your application's entry point:

```typescript
import { initRuntimeEnv, getEnv } from '@/utils/runtime-env';

// Initialize and wait for environment to be ready
await initRuntimeEnv();

// Or listen for the load event
window.addEventListener('runtime-env-loaded', () => {
  // Environment is ready
});
```

### Accessing Variables

```typescript
// Get a string value with a default
const apiUrl = getEnv('PUBLIC_API_URL', 'https://api.example.com');

// Get a boolean value
const experimentalFeatures = getEnv('ENABLE_EXPERIMENTAL_FEATURES', false);

// Get a number value
const timeout = getEnv('REQUEST_TIMEOUT_MS', 5000);
```

## Security Considerations

1. **Client-side Exposure**
   - Only variables prefixed with `PUBLIC_` should be exposed to the client
   - Sensitive values should never be included in the runtime environment

2. **Default Values**
   - Always provide secure defaults for all variables
   - Defaults should work in development without additional configuration

## Development Workflow

### Adding a New Variable

1. Add the variable to the `RuntimeEnv` interface in `global.d.ts`
2. Add a default value in `runtime-env.ts`
3. Document the variable in this file
4. Update any deployment configurations

### Environment Variable Precedence

1. Values in `runtime-env.json` (highest priority)
2. Default values in `runtime-env.ts` (lowest priority)

## Deployment

### Building with Variables

During the build process, environment variables are written to `public/runtime-env.json`:

```bash
# Example build command with environment variables
VERSION=1.0.0 \
ENABLE_EXPERIMENTAL_FEATURES=true \
npm run build
```

### Server Configuration

For production, ensure your web server serves the `runtime-env.json` file with appropriate caching headers:

```nginx
# Nginx configuration
location /runtime-env.json {
  add_header Cache-Control "no-store, no-cache, must-revalidate";
  try_files $uri /runtime-env.default.json;
}
```

## Best Practices

1. **Naming Conventions**
   - Use `UPPER_SNAKE_CASE` for all variable names
   - Prefix client-accessible variables with `PUBLIC_`
   - Group related variables with consistent prefixes

2. **Documentation**
   - Document all variables in this file
   - Include expected format and example values
   - Note any security considerations

3. **Validation**
   - Validate all environment variables at startup
   - Provide clear error messages for missing or invalid values

## Example Configuration

```json
// runtime-env.json
{
  "PUBLIC_API_URL": "https://api.example.com/v1",
  "PUBLIC_AUTH_URL": "https://auth.example.com",
  "ENABLE_EXPERIMENTAL_FEATURES": "false",
  "VERSION": "1.0.0",
  "BUILD_TIMESTAMP": "2023-01-01T00:00:00.000Z"
}
```

## Troubleshooting

### Common Issues

1. **Variables not updating**
   - Clear browser cache
   - Verify `runtime-env.json` is being served with `no-cache` headers
   - Check browser network tab for failed requests to `runtime-env.json`

2. **Type errors**
   - Ensure the variable is properly typed in `RuntimeEnv`
   - Verify the default value matches the expected type

3. **Missing variables**
   - Check for typos in variable names
   - Verify the variable is included in the build process

## Related Documentation

- [Environment Variables](./environment-variables.md)
- [Deployment Guide](../deployment/README.md)
- [Security Best Practices](../security/best-practices.md)
