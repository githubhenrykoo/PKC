import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

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
        
        console.log('✅ Authorization code found, marking as successful');
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


