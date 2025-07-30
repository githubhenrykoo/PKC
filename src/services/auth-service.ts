import type { User, AuthTokens, AuthResponse, TokenRefreshResponse } from '../store/types/auth';
import { env } from '../utils/env';

interface OIDCUserInfo {
  sub: string;
  email: string;
  preferred_username: string;
  given_name?: string;
  family_name?: string;
  groups?: string[];
  picture?: string;
  [key: string]: any;
}

interface OIDCTokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in: number;
  token_type: string;
}

class AuthService {
  private baseUrl: string;
  private clientId: string;
  private redirectUri: string;
  private scope: string;

  constructor() {
    // TEMPORARY: Hardcoded environment variables for deployment
    this.baseUrl = "https://auth.pkc.pub";
    this.clientId = "aB0bijEh4VBAQL3rGXsrbcM8ZoJv9OIayUz0rHgo";
    
    // TEMPORARY: Hardcoded redirect URI for deployment
    this.redirectUri = "https://dev.pkc.pub/auth/callback";
    this.scope = 'openid profile email';
    
    // Debug: Log the loaded environment variables
    console.log('🔧 AuthService Runtime Environment Variables:');
    console.log('BASE URL:', this.baseUrl);
    console.log('CLIENT ID:', this.clientId);
    console.log('REDIRECT URI:', this.redirectUri);
    // Use proper type assertion to fix TypeScript error
    console.log('Using runtime env:', typeof window !== 'undefined' && (window as Window & {RUNTIME_ENV?: any}).RUNTIME_ENV ? 'YES' : 'NO');
  }

  /**
   * Initiate Authentik OIDC login flow
   */
  async loginWithAuthentik(): Promise<void> {
    const state = this.generateRandomString(32);
    const nonce = this.generateRandomString(32);
    
    // Store state and nonce for validation
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('auth_state', state);
      sessionStorage.setItem('auth_nonce', nonce);
    }

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: this.scope,
      state,
      nonce,
    });

    const authUrl = `${this.baseUrl}/application/o/authorize/?${params.toString()}`;
    
    // Redirect to Authentik
    window.location.href = authUrl;
  }

  /**
   * Handle authentication callback from Authentik
   */
  async handleCallback(callbackUrl: string): Promise<AuthResponse> {
    const url = new URL(callbackUrl);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      throw new Error(`Authentication error: ${error}`);
    }

    if (!code) {
      throw new Error('No authorization code received');
    }

    // Validate state parameter
    const storedState = sessionStorage.getItem('auth_state');
    if (state !== storedState) {
      throw new Error('Invalid state parameter');
    }

    // Exchange code for tokens
    const tokens = await this.exchangeCodeForTokens(code);
    
    // Get user info
    const userInfo = await this.getUserInfo(tokens.accessToken);
    
    // Convert to our User interface
    const user = this.mapUserInfo(userInfo);
    
    // Extract permissions from groups
    const permissions = this.extractPermissions(userInfo.groups || []);

    // Clean up stored state
    sessionStorage.removeItem('auth_state');
    sessionStorage.removeItem('auth_nonce');

    return {
      user,
      tokens,
      permissions,
    };
  }

  /**
   * Exchange authorization code for tokens
   */
  private async exchangeCodeForTokens(code: string): Promise<AuthTokens> {
    const response = await fetch(`${this.baseUrl}/application/o/token/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.redirectUri,
        client_id: this.clientId,
        // TEMPORARY: Hardcoded client secret for deployment
        client_secret: "Fji9cdAIT7whfY5wDcLF8TK9gj6ce6N224LokKzpUAVicQ5CB0Z84BA9ufyMjKZkMyxj3Wa8Ua4FuhSwfEEpwFWe3sx3f8Npz3RE7MAUtxmebax6JoHuUKnsQrzJyGMl",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Token exchange failed: ${errorData.error || response.statusText}`);
    }

    const data: OIDCTokenResponse = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || '',
      idToken: data.id_token || '',
      expiresAt: Date.now() + (data.expires_in * 1000),
      tokenType: 'Bearer',
    };
  }

  /**
   * Get user information from Authentik
   */
  async getUserInfo(accessToken: string): Promise<OIDCUserInfo> {
    const response = await fetch(`${this.baseUrl}/application/o/userinfo/`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user info: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<TokenRefreshResponse> {
    const response = await fetch(`${this.baseUrl}/application/o/token/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.clientId,
        // TEMPORARY: Hardcoded client secret for deployment
        client_secret: "Fji9cdAIT7whfY5wDcLF8TK9gj6ce6N224LokKzpUAVicQ5CB0Z84BA9ufyMjKZkMyxj3Wa8Ua4FuhSwfEEpwFWe3sx3f8Npz3RE7MAUtxmebax6JoHuUKnsQrzJyGMl",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Token refresh failed: ${errorData.error || response.statusText}`);
    }

    const data: OIDCTokenResponse = await response.json();

    return {
      tokens: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        idToken: data.id_token || '',
        expiresAt: Date.now() + (data.expires_in * 1000),
        tokenType: 'Bearer',
      },
    };
  }

  /**
   * Get user profile (same as getUserInfo but returns our User interface)
   */
  async getUserProfile(accessToken: string): Promise<User> {
    const userInfo = await this.getUserInfo(accessToken);
    return this.mapUserInfo(userInfo);
  }

  /**
   * Update user profile (placeholder - depends on Authentik API)
   */
  async updateUserProfile(accessToken: string, updates: Partial<User>): Promise<User> {
    // This would need to be implemented based on Authentik's user update API
    // For now, throw an error indicating it's not implemented
    throw new Error('User profile updates not yet implemented');
  }

  /**
   * Logout user
   */
  async logout(accessToken: string): Promise<void> {
    try {
      // Revoke token on Authentik side
      await fetch(`${this.baseUrl}/application/o/revoke/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Bearer ${accessToken}`,
        },
        body: new URLSearchParams({
          token: accessToken,
          client_id: this.clientId,
          // TEMPORARY: Hardcoded client secret for deployment
        client_secret: "Fji9cdAIT7whfY5wDcLF8TK9gj6ce6N224LokKzpUAVicQ5CB0Z84BA9ufyMjKZkMyxj3Wa8Ua4FuhSwfEEpwFWe3sx3f8Npz3RE7MAUtxmebax6JoHuUKnsQrzJyGMl",
        }),
      });
    } catch (error) {
      console.warn('Failed to revoke token on server:', error);
    }

    // Redirect to Authentik logout endpoint
    const logoutUrl = `${this.baseUrl}/application/o/pkc/end-session/`;
    window.location.href = logoutUrl;
  }

  /**
   * Map OIDC user info to our User interface
   */
  private mapUserInfo(userInfo: OIDCUserInfo): User {
    return {
      id: userInfo.sub,
      email: userInfo.email,
      username: userInfo.preferred_username,
      firstName: userInfo.given_name || '',
      lastName: userInfo.family_name || '',
      roles: userInfo.groups || [],
      groups: userInfo.groups || [],
      avatar: userInfo.picture,
      preferences: {
        theme: 'system',
        language: 'en',
        notifications: {
          email: true,
          push: true,
          inApp: true,
        },
        privacy: {
          profileVisibility: 'private',
          dataSharing: false,
        },
      },
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };
  }

  /**
   * Extract permissions from user groups
   */
  private extractPermissions(groups: string[]): string[] {
    const permissions: string[] = [];

    // Map groups to permissions based on PKC roles
    if (groups.includes('pkc_admin')) {
      permissions.push('admin', 'write', 'read');
    } else if (groups.includes('pkc_user')) {
      permissions.push('write', 'read');
    } else if (groups.includes('pkc_viewer')) {
      permissions.push('read');
    }

    // Add specific permission groups
    groups.forEach(group => {
      if (group.startsWith('pkc_permission_')) {
        const permission = group.replace('pkc_permission_', '');
        if (!permissions.includes(permission)) {
          permissions.push(permission);
        }
      }
    });

    return permissions;
  }

  /**
   * Generate a random string for state/nonce
   */
  private generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Check if user is authenticated by validating token
   */
  isAuthenticated(tokens: AuthTokens | null): boolean {
    if (!tokens || !tokens.accessToken) {
      return false;
    }

    // Check if token is expired
    return Date.now() < tokens.expiresAt;
  }

  /**
   * Get time until token expires (in milliseconds)
   */
  getTokenTimeRemaining(tokens: AuthTokens | null): number {
    if (!tokens) return 0;
    return Math.max(0, tokens.expiresAt - Date.now());
  }
}

// Export singleton instance
export const authService = new AuthService();
