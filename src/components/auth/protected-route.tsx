import React from 'react';
import { useSelector } from 'react-redux';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Lock, AlertCircle } from 'lucide-react';
import { LoginButton } from './login-button';
import { 
  selectIsAuthenticated, 
  selectIsLoading, 
  selectHasPermission,
  selectIsAccountLocked,
  selectIsTokenExpired 
} from '@/store/selectors';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
  fallback?: React.ReactNode;
  showLoginPrompt?: boolean;
}

export function ProtectedRoute({ 
  children, 
  requiredPermissions = [], 
  fallback,
  showLoginPrompt = true 
}: ProtectedRouteProps) {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isLoading = useSelector(selectIsLoading);
  const isAccountLocked = useSelector(selectIsAccountLocked);
  const isTokenExpired = useSelector(selectIsTokenExpired);

  // Check permissions if user is authenticated
  const hasRequiredPermissions = requiredPermissions.length === 0 || 
    requiredPermissions.every(permission => 
      useSelector(state => selectHasPermission(state, permission))
    );

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Shield className="h-8 w-8 mx-auto animate-pulse text-primary" />
              <div>
                <h3 className="text-lg font-semibold">Verifying Access</h3>
                <p className="text-muted-foreground">Please wait...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show account locked message
  if (isAccountLocked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <Lock className="mr-2 h-5 w-5" />
              Account Locked
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Your account has been temporarily locked due to multiple failed login attempts. 
              Please try again later.
            </p>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.location.href = '/'}
            >
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show token expired message
  if (isAuthenticated && isTokenExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center text-amber-600">
              <AlertCircle className="mr-2 h-5 w-5" />
              Session Expired
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Your session has expired. Please log in again to continue.
            </p>
            <LoginButton fullWidth />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (!showLoginPrompt) {
      return null;
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="mr-2 h-5 w-5" />
              Authentication Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              You need to be logged in to access this content. Please authenticate with your PKC account.
            </p>
            
            {requiredPermissions.length > 0 && (
              <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                <p className="font-medium mb-1">Required permissions:</p>
                <ul className="list-disc list-inside space-y-1">
                  {requiredPermissions.map(permission => (
                    <li key={permission} className="capitalize">
                      {permission.replace('_', ' ')}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <LoginButton fullWidth />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show insufficient permissions message
  if (!hasRequiredPermissions) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <Lock className="mr-2 h-5 w-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              You don't have the required permissions to access this content.
            </p>
            
            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
              <p className="font-medium mb-1">Required permissions:</p>
              <ul className="list-disc list-inside space-y-1">
                {requiredPermissions.map(permission => (
                  <li key={permission} className="capitalize">
                    {permission.replace('_', ' ')}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => window.history.back()}
              >
                Go Back
              </Button>
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => window.location.href = '/'}
              >
                Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User is authenticated and has required permissions
  return <>{children}</>;
}
