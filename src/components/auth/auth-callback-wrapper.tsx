import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/MVPCard/card.tsx';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

// OAuth token exchange function with PKCE support
async function exchangeCodeForTokens(code: string, state: string) {
  console.log('🔄 Exchanging authorization code for tokens...');
  
  // Use environment variables from window.RUNTIME_ENV (loaded dynamically)
  const authUrl = window.RUNTIME_ENV?.PUBLIC_AUTHENTIK_URL;
  const clientId = window.RUNTIME_ENV?.PUBLIC_AUTHENTIK_CLIENT_ID;
  const redirectUri = window.RUNTIME_ENV?.PUBLIC_AUTHENTIK_REDIRECT_URI;
  const clientSecret = window.RUNTIME_ENV?.PUBLIC_AUTHENTIK_CLIENT_SECRET;
  
  console.log('🔧 Environment variables in token exchange:', {
    authUrl,
    clientId,
    redirectUri
  });
  
  if (!redirectUri) {
    console.error('❌ Missing PUBLIC_AUTHENTIK_REDIRECT_URI environment variable');
    throw new Error('Missing PUBLIC_AUTHENTIK_REDIRECT_URI environment variable');
  }
  
  console.log('🔗 Using redirect URI from environment:', redirectUri);
  console.log('🌐 Using token endpoint:', `${authUrl}/application/o/token/`);
  
  // Authentik token endpoint
  const tokenEndpoint = `${authUrl}/application/o/token/`;
  
  // PKCE code verifier if available from login flow
  const codeVerifier = sessionStorage.getItem('pkce_code_verifier');
  
  // Set up basic token request parameters
  const tokenParams: Record<string, string> = {
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: redirectUri,
    client_id: clientId!,
  };
  
  // For Confidential clients, use client_secret
  if (clientSecret) {
    tokenParams.client_secret = clientSecret;
    console.log('🔐 Using client_secret authentication (Confidential client)');
  } else if (codeVerifier) {
    // For Public clients, use PKCE
    tokenParams.code_verifier = codeVerifier;
    console.log('🔒 Using PKCE authentication (Public client)');
  } else {
    console.warn('⚠️ No client secret or PKCE verifier available!');
  }
  
  // Log request parameters (without sensitive data)
  console.log('💬 Token request details:');
  console.log('- Endpoint:', tokenEndpoint);
  console.log('- Method: POST');
  console.log('- Parameters:', Object.keys(tokenParams));
  console.log('- Client ID:', clientId);
  console.log('- Redirect URI:', redirectUri);
  console.log('- Has Client Secret:', !!tokenParams.client_secret);
  console.log('- Has Code Verifier:', !!tokenParams.code_verifier);
  
  // Make the token request
  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams(tokenParams)
  });
  
  // Handle response
  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Token exchange failed:', response.status, errorText);
    
    // Provide more helpful error messages
    if (response.status === 400) {
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error === 'invalid_client') {
          throw new Error('OAuth client authentication failed. Please check:\n1. Client ID is correct\n2. Authentik OAuth application is configured properly\n3. Client secret is correct (for Confidential client)');
        } else {
          throw new Error(`OAuth error: ${errorData.error} - ${errorData.error_description || 'Unknown error'}`);
        }
      } catch (e) {
        // If JSON parsing fails, throw the raw error text
        throw new Error(`Token exchange failed: ${errorText}`);
      }
    }
    
    throw new Error(`Token exchange failed: ${response.status} ${response.statusText}`);
  }
  
  // Clear PKCE verifier after successful token exchange
  if (codeVerifier) {
    sessionStorage.removeItem('pkce_code_verifier');
  }
  
  return await response.json();
}

// Fetch user profile from Authentik
async function fetchUserProfile(accessToken: string) {
  console.log('👤 Fetching user profile from Authentik...');
  
  const authUrl = window.RUNTIME_ENV?.PUBLIC_AUTHENTIK_URL || 'https://auth.pkc.pub';
  const userInfoEndpoint = `${authUrl}/application/o/userinfo/`;
  
  console.log('🔧 Using authUrl for userinfo:', authUrl);
  
  const response = await fetch(userInfoEndpoint, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ User profile fetch failed:', response.status, errorText);
    throw new Error(`User profile fetch failed: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}

// Safe wrapper that handles authentication callback without Redux complexity
export function AuthCallbackWrapper() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Waiting for runtime environment...');
  const [runtimeEnvLoaded, setRuntimeEnvLoaded] = useState(false);

  // Wait for runtime environment to be loaded
  useEffect(() => {
    const checkRuntimeEnv = () => {
      if (window.RUNTIME_ENV) {
        console.log('✅ Runtime environment available for auth:', Object.keys(window.RUNTIME_ENV));
        setRuntimeEnvLoaded(true);
        setMessage('Processing authentication...');
        return true;
      }
      return false;
    };

    // Check if already loaded
    if (checkRuntimeEnv()) return;

    // Listen for runtime env loaded event
    const handleRuntimeEnvLoaded = () => {
      console.log('🔔 Runtime environment loaded event received in auth component');
      if (checkRuntimeEnv()) {
        setRuntimeEnvLoaded(true);
        setMessage('Processing authentication...');
      }
    };

    window.addEventListener('runtime-env-loaded', handleRuntimeEnvLoaded);
    
    // Fallback timeout
    const timeout = setTimeout(() => {
      if (!window.RUNTIME_ENV) {
        console.error('⏰ Timeout waiting for runtime environment in auth component');
        setStatus('error');
        setMessage('Failed to load application configuration');
      }
    }, 10000);

    return () => {
      window.removeEventListener('runtime-env-loaded', handleRuntimeEnvLoaded);
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (!runtimeEnvLoaded) return;

    const handleCallback = async () => {
      try {
        console.log('🔧 AuthCallbackWrapper: Starting callback processing...');
        console.log('🔧 Using runtime environment for OAuth:', {
          authUrl: window.RUNTIME_ENV?.PUBLIC_AUTHENTIK_URL,
          clientId: window.RUNTIME_ENV?.PUBLIC_AUTHENTIK_CLIENT_ID ? 'present' : 'missing',
          redirectUri: window.RUNTIME_ENV?.PUBLIC_AUTHENTIK_REDIRECT_URI
        });
        console.log('🔧 Current URL:', window.location.href);
        console.log('🔧 Search params:', window.location.search);
        
        // Get the current URL with query parameters
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        
        console.log('🔧 URL Parameters:');
        console.log('  - code:', code ? `${code.substring(0, 10)}...` : 'null');
        console.log('  - state:', state);
        
        if (!code || !state) {
          console.error('❌ Missing authorization parameters:', { code: !!code, state: !!state });
          setStatus('error');
          setMessage('Authentication failed: Missing authorization parameters');
          return;
        }
        
        console.log('✅ Authorization code found, processing authentication...');
        setMessage('Exchanging code for tokens...');
        
        // Exchange authorization code for access tokens
        try {
          // We've already checked that code and state are not null above
          const tokenResponse = await exchangeCodeForTokens(code, state);
          console.log('🔑 Token exchange successful');
          
          setMessage('Fetching user profile...');
          
          // Fetch user profile using access token
          if (!tokenResponse.access_token) {
            throw new Error('No access token received from token exchange');
          }
          const userProfile = await fetchUserProfile(tokenResponse.access_token);
          console.log('👤 User profile fetched:', userProfile);
          
          const userInfo = {
            id: userProfile.sub || userProfile.id || state,
            email: userProfile.email,
            username: userProfile.preferred_username || userProfile.username,
            firstName: userProfile.given_name,
            lastName: userProfile.family_name,
            fullName: userProfile.name,
            avatar: userProfile.picture,
            loginTime: new Date().toISOString(),
            accessToken: tokenResponse.access_token,
            refreshToken: tokenResponse.refresh_token,
            expiresAt: Date.now() + (tokenResponse.expires_in * 1000)
          };
          
          // Store user info in localStorage for TopBar to access
          localStorage.setItem('pkc_user', JSON.stringify(userInfo));
          localStorage.setItem('pkc_authenticated', 'true');
          
          console.log('✅ Real user information stored:', userInfo);
        } catch (error) {
          console.error('❌ Authentication failed:', error);
          setStatus('error');
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          setMessage(`Authentication failed: ${errorMessage}`);
          return;
        }
        setMessage('Authentication successful!');
        setStatus('success');
        
        console.log('🔄 Redirecting to dashboard in 2 seconds...');
        // Redirect to dashboard after a brief delay
        setTimeout(() => {
          console.log('🔄 Executing redirect to /dashboard');
          window.location.href = '/dashboard';
        }, 2000);
        
      } catch (error) {
        console.error('❌ Authentication callback error:', error);
        setMessage(error instanceof Error ? error.message : 'Authentication failed');
        setStatus('error');
      }
    };

    console.log('🚀 AuthCallbackWrapper: Runtime env loaded, processing callback...');
    // Process the callback
    handleCallback();
  }, [runtimeEnvLoaded]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            {status === 'loading' && (
              <>
                <div className="flex justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold">Authenticating...</h2>
                  <p className="text-muted-foreground">{message}</p>
                </div>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="flex justify-center">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-green-600">
                    Login Successful!
                  </h2>
                  <p className="text-muted-foreground">
                    Redirecting you to the dashboard...
                  </p>
                </div>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="flex justify-center">
                  <XCircle className="h-8 w-8 text-destructive" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-destructive">
                    Authentication Failed
                  </h2>
                  <p className="text-muted-foreground">{message}</p>
                  <div className="pt-4">
                    <button
                      onClick={() => window.location.href = '/dashboard'}
                      className="text-primary hover:underline"
                    >
                      Return to Dashboard
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


