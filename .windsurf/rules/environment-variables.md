---
trigger: always_on
---

# Environment Variable Management Rules

## Core Principles

1. **Single Source of Truth**
   - The `.env` file is the primary source of truth for all environment variables
   - Docker Compose must use environment variables from `.env` file, not hardcoded values
   - All environment configurations must be documented in the `.env.example` file

2. **Runtime Environment Variable Injection**
   - All `PUBLIC_*` environment variables must be accessible in client-side code at runtime
   - Environment variables must be injected into the application without requiring rebuilds
   - Docker containers must read environment variables from Docker Compose environment section

3. **Security and Isolation**
   - Sensitive environment variables must never be committed to version control
   - Client-side code must only access `PUBLIC_*` prefixed variables
   - Server-side code can access all environment variables

4. **Deployment Consistency**
   - The same Docker image must be deployable to multiple environments by changing only the `.env` file
   - Local development and production environments must use the same environment variable loading mechanism

## Implementation Requirements

1. **Environment Variable Naming**
   - All client-side accessible environment variables must use the `PUBLIC_` prefix
   - All server-side only environment variables must not use the `PUBLIC_` prefix
   - Use snake_case for environment variable names

2. **Docker Integration**
   - Docker Compose must include `env_file: .env` to load environment variables
   - Never hardcode environment variable values in `docker-compose.yml`
   - Use environment variable substitution for sensitive values: `${VARIABLE_NAME}`

3. **Runtime Variable Access**
   - Client-side code must use the `env.js` utility for accessing environment variables
   - Server-side code should use `import.meta.env` for accessing environment variables
   - Always provide fallback values for optional environment variables

4. **Documentation**
   - All required environment variables must be listed in `.env.example` with descriptions
   - Environment variable changes must be documented in the project changelog

## Example Usage

### Docker Compose Configuration

```yaml
version: '3.8'

services:
  pkc-app:
    image: henry768/pkc:latest
    env_file:
      - .env
    environment:
      - NODE_ENV=production
```

### Environment Variable Utility Usage

```typescript
// src/utils/env.js
import { createEnv } from './env-utils';

export const env = createEnv();

// Usage in components
import { env } from '../utils/env';

const authUrl = env.PUBLIC_AUTHENTIK_URL || 'https://auth.default.com';
```

## Testing Environment Variables

1. Always test that environment variables are correctly loaded in all environments:
   - Local development
   - Docker container
   - Production deployment

2. Include environment variable verification in CI/CD pipeline

## Important Rules

1. Never hardcode environment variable values directly in code or Docker Compose
2. Always provide fallback values for non-critical environment variables
3. Always document new environment variables in `.env.example`
4. Always test environment variable injection after changing the Docker image
5. Do not expose non-PUBLIC environment variables to client-side code
6. Do not store sensitive credentials in PUBLIC environment variables
7. Do not commit `.env` files to version control (except `.env.example`)
8. Always use Docker Compose `env_file` directive to load environment variables
9. Document all environment variable requirements in deployment instructions
