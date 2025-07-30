# Authentik Authentication Integration for PKC

## Overview

This document outlines the integration of Authentik as the primary authentication provider for the PKC (Personal Knowledge Container) project. Authentik is a modern, open-source identity provider that offers comprehensive authentication and authorization capabilities.

## Authentik Instance

- **URL**: https://auth.pkc.pub
- **Provider Type**: OpenID Connect (OIDC) / SAML / OAuth2
- **Primary Use Case**: Single Sign-On (SSO) for PKC application

## What is Authentik?

Authentik is an open-source identity provider focused on flexibility and versatility. It supports:

- **Multiple Protocols**: OAuth2, OpenID Connect, SAML, LDAP
- **Modern Authentication**: Multi-factor authentication (MFA), WebAuthn, TOTP
- **User Management**: Self-service registration, password resets, user profiles
- **Flow-Based Configuration**: Customizable authentication and authorization flows
- **Enterprise Features**: SCIM provisioning, advanced policy engine, audit logging

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PKC Frontend  │    │   Authentik     │    │   PKC Backend   │
│   (Astro App)   │◄──►│   (auth.pkc.pub)│◄──►│   (API Server)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Integration Approach

### 1. Authentication Flow

1. **User Access**: User attempts to access protected PKC resources
2. **Redirect**: PKC redirects to Authentik for authentication
3. **Login**: User authenticates with Authentik (username/password, MFA, etc.)
4. **Token Exchange**: Authentik returns authentication tokens
5. **Authorization**: PKC validates tokens and grants access
6. **Session Management**: PKC maintains user session with token refresh

### 2. Protocol Selection

**Recommended**: OpenID Connect (OIDC)
- Modern, secure, and well-supported
- JWT tokens for stateless authentication
- Built-in token refresh mechanisms
- Extensive scope and claims support

## Implementation Plan

### Phase 1: Authentik Configuration

1. **Application Setup**
   - Create OIDC application in Authentik
   - Configure redirect URIs for PKC
   - Set up appropriate scopes and claims
   - Configure token lifetimes

2. **User Management**
   - Define user roles and permissions
   - Set up user registration flows
   - Configure password policies
   - Enable MFA options

### Phase 2: PKC Frontend Integration

1. **Authentication Library**
   - Install OIDC client library (e.g., `@auth/core` or `oidc-client-ts`)
   - Configure OIDC provider settings
   - Implement login/logout flows

2. **Route Protection**
   - Create authentication middleware
   - Protect sensitive routes
   - Handle authentication state

3. **User Interface**
   - Login/logout buttons
   - User profile display
   - Authentication status indicators

### Phase 3: PKC Backend Integration

1. **Token Validation**
   - Implement JWT token validation
   - Verify token signatures with Authentik's public keys
   - Handle token expiration and refresh

2. **Authorization**
   - Map Authentik roles to PKC permissions
   - Implement role-based access control (RBAC)
   - Create authorization middleware

## Configuration

### Environment Variables

```bash
# Authentik OIDC Configuration
AUTHENTIK_URL=https://auth.pkc.pub
AUTHENTIK_CLIENT_ID=your_client_id
AUTHENTIK_CLIENT_SECRET=your_client_secret
AUTHENTIK_REDIRECT_URI=https://your-pkc-domain.com/auth/callback
AUTHENTIK_SCOPE=openid profile email
AUTHENTIK_RESPONSE_TYPE=code
```

### Authentik Application Settings

```yaml
# Example Authentik Application Configuration
name: PKC Application
client_type: confidential
authorization_grant_type: authorization-code
redirect_uris:
  - https://localhost:4321/auth/callback
  - https://your-pkc-domain.com/auth/callback
allowed_scopes:
  - openid
  - profile
  - email
  - pkc_admin  # Custom scope for PKC admin access
token_endpoint_auth_method: client_secret_basic
```

## Security Considerations

### 1. Token Security
- Use HTTPS for all authentication endpoints
- Implement proper token storage (HttpOnly cookies for web)
- Set appropriate token expiration times
- Implement token refresh logic

### 2. CSRF Protection
- Use state parameters in OIDC flows
- Implement CSRF tokens for form submissions
- Validate redirect URIs strictly

### 3. Session Management
- Implement secure session invalidation
- Handle concurrent sessions appropriately
- Log security events for audit trails

## User Roles and Permissions

### Proposed Role Structure

1. **PKC Admin**
   - Full system access
   - User management capabilities
   - System configuration access

2. **PKC User**
   - Standard user access
   - Personal data management
   - Limited sharing capabilities

3. **PKC Viewer**
   - Read-only access
   - Limited data visibility
   - No modification rights

### Claims Mapping

```json
{
  "sub": "user_unique_id",
  "email": "user@example.com",
  "preferred_username": "username",
  "given_name": "John",
  "family_name": "Doe",
  "groups": ["pkc_admin", "pkc_user"],
  "pkc_permissions": ["read", "write", "admin"]
}
```

## Implementation Examples

### Frontend Authentication (Astro)

```typescript
// src/lib/auth.ts
import { OIDCClient } from 'oidc-client-ts';

export const authClient = new OIDCClient({
  authority: import.meta.env.AUTHENTIK_URL,
  client_id: import.meta.env.AUTHENTIK_CLIENT_ID,
  redirect_uri: `${import.meta.env.SITE}/auth/callback`,
  response_type: 'code',
  scope: 'openid profile email',
  post_logout_redirect_uri: import.meta.env.SITE,
});

export async function login() {
  return authClient.createSigninRequest();
}

export async function handleCallback(url: string) {
  return authClient.processSigninResponse(url);
}
```

### Backend Token Validation

```typescript
// src/middleware/auth.ts
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const client = jwksClient({
  jwksUri: `${process.env.AUTHENTIK_URL}/application/o/pkc/jwks/`
});

export async function validateToken(token: string) {
  try {
    const decoded = jwt.decode(token, { complete: true });
    const kid = decoded?.header.kid;
    
    const key = await client.getSigningKey(kid);
    const signingKey = key.getPublicKey();
    
    return jwt.verify(token, signingKey, {
      issuer: process.env.AUTHENTIK_URL,
      audience: process.env.AUTHENTIK_CLIENT_ID,
    });
  } catch (error) {
    throw new Error('Invalid token');
  }
}
```

## Testing Strategy

### 1. Unit Tests
- Token validation logic
- Authentication middleware
- User role mapping

### 2. Integration Tests
- Full authentication flow
- Token refresh scenarios
- Authorization checks

### 3. E2E Tests
- User login/logout flows
- Protected route access
- Cross-browser compatibility

## Monitoring and Logging

### Authentication Events
- Successful logins
- Failed login attempts
- Token refresh events
- Authorization failures

### Metrics to Track
- Authentication success rate
- Token expiration rates
- User session durations
- API authentication latency

## Troubleshooting

### Common Issues

1. **Redirect URI Mismatch**
   - Verify redirect URIs in Authentik configuration
   - Check for HTTP vs HTTPS mismatches
   - Ensure exact URL matching

2. **Token Validation Failures**
   - Verify JWKS endpoint accessibility
   - Check token expiration times
   - Validate issuer and audience claims

3. **CORS Issues**
   - Configure proper CORS headers
   - Whitelist Authentik domain
   - Handle preflight requests

## Deployment Considerations

### Docker Integration
- Ensure Authentik URL is accessible from containers
- Handle environment variable injection
- Consider network connectivity between services

### Scaling Considerations
- Stateless authentication design
- Token caching strategies
- Load balancer session affinity (if needed)

## Migration Plan

### From No Authentication
1. Implement authentication middleware
2. Add login/logout UI components
3. Protect existing routes gradually
4. Test with subset of users
5. Full rollout with fallback plan

### Future Enhancements
- Social login integration
- Advanced MFA options
- Custom authentication flows
- API key management
- Automated user provisioning

## References

- [Authentik Documentation](https://docs.goauthentik.io/)
- [OpenID Connect Specification](https://openid.net/connect/)
- [OAuth 2.0 Security Best Practices](https://tools.ietf.org/html/draft-ietf-oauth-security-topics)
- [Astro Authentication Guide](https://docs.astro.build/en/guides/authentication/)

---

**Last Updated**: 2025-07-30
**Version**: 1.0
**Status**: Planning Phase
