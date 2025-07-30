import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

// OAuth token exchange function with PKCE support
async function exchangeCodeForTokens(code: string, state: string) {
  console.log('🔄 Exchanging authorization code for tokens...');
  
  const authUrl = import.meta.env.PUBLIC_AUTHENTIK_URL || 'https://auth.pkc.pub';
  const clientId = import.meta.env.PUBLIC_AUTHENTIK_CLIENT_ID;
  const redirectUri = `${window.location.origin}/auth/callback`;
  
  const tokenEndpoint = `${authUrl}/application/o/token/`;
  
  // Try PKCE first (more secure for client-side apps)
  const codeVerifier = sessionStorage.getItem('pkce_code_verifier');
  
  const tokenParams: Record<string, string> = {
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: redirectUri,
    client_id: clientId!,
  };
  
  // Add PKCE code_verifier if available, otherwise try client_secret
  if (codeVerifier) {
    console.log('🔐 Using PKCE authentication');
    tokenParams.code_verifier = codeVerifier;
  } else {
    console.log('🔐 Using client secret authentication');
    const clientSecret = import.meta.env.PUBLIC_AUTHENTIK_CLIENT_SECRET;
    if (clientSecret) {
      tokenParams.client_secret = clientSecret;
    } else {
      console.warn('⚠️ No client secret or PKCE verifier available');
    }
  }
  
  console.log('🔄 Token request params:', Object.keys(tokenParams));
  
  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(tokenParams),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Token exchange failed:', response.status, errorText);
    
    // Provide more helpful error messages
    if (response.status === 400) {
      const errorData = JSON.parse(errorText);
      if (errorData.error === 'invalid_client') {
        throw new Error('OAuth client authentication failed. Please check:\n1. Client ID is correct\n2. Authentik OAuth application is configured properly\n3. Client secret is set (or PKCE is enabled)');
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
  
  const authUrl = import.meta.env.PUBLIC_AUTHENTIK_URL || 'https://auth.pkc.pub';
  const userInfoEndpoint = `${authUrl}/application/o/userinfo/`;
  
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
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('🔧 AuthCallbackWrapper: Starting callback processing...');
        console.log('🔧 Current URL:', window.location.href);
        console.log('🔧 Search params:', window.location.search);
        
        // Get the current URL with query parameters
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        
        console.log('🔧 URL Parameters:');
        console.log('  - code:', code ? `${code.substring(0, 10)}...` : 'null');
        console.log('  - state:', state);
        
        if (!code) {
          console.error('❌ No authorization code found in URL');
          throw new Error('No authorization code received');
        }
        
        console.log('✅ Authorization code found, processing authentication...');
        setMessage('Exchanging code for tokens...');
        
        // Exchange authorization code for access tokens
        try {
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

    console.log('🚀 AuthCallbackWrapper: Component mounted, processing callback...');
    // Process the callback
    handleCallback();
  }, []);

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


