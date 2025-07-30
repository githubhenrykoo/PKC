import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { handleAuthCallback, clearError } from '@/store/slices';
import { selectIsLoading, selectError, selectIsAuthenticated } from '@/store/selectors';
import type { AppDispatch } from '@/store';

export function AuthCallback() {
  const dispatch = useDispatch<AppDispatch>();
  const isLoading = useSelector(selectIsLoading);
  const error = useSelector(selectError);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  useEffect(() => {
    // Clear any previous errors
    dispatch(clearError());

    // Get the current URL with query parameters
    const callbackUrl = window.location.href;
    
    // Handle the authentication callback
    dispatch(handleAuthCallback(callbackUrl));
  }, [dispatch]);

  // If successfully authenticated, redirect to home
  if (isAuthenticated && !isLoading && !error) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            {isLoading && (
              <>
                <div className="flex justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold">Authenticating...</h2>
                  <p className="text-muted-foreground">
                    Please wait while we complete your login.
                  </p>
                </div>
              </>
            )}

            {error && (
              <>
                <div className="flex justify-center">
                  <XCircle className="h-8 w-8 text-destructive" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-destructive">
                    Authentication Failed
                  </h2>
                  <p className="text-muted-foreground">
                    {error}
                  </p>
                  <div className="pt-4">
                    <button
                      onClick={() => window.location.href = '/'}
                      className="text-primary hover:underline"
                    >
                      Return to Home
                    </button>
                  </div>
                </div>
              </>
            )}

            {!isLoading && !error && isAuthenticated && (
              <>
                <div className="flex justify-center">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-green-600">
                    Login Successful!
                  </h2>
                  <p className="text-muted-foreground">
                    Redirecting you to the application...
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
