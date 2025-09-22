import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/MVPCard/card.tsx';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoginButton } from './login-button';
import { UserProfile } from './user-profile';
import { 
  selectIsAuthenticated, 
  selectUser, 
  selectIsLoading, 
  selectError,
  selectTokens,
  selectPermissions,
  selectSessionTimeRemainingMinutes 
} from '@/store/selectors';
import { logoutUser, clearError } from '@/store/slices';
import { Shield, CheckCircle, XCircle, Clock, Key, User } from 'lucide-react';
import type { AppDispatch } from '@/store';

export function AuthTestPage() {
  const dispatch = useDispatch<AppDispatch>();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);
  const isLoading = useSelector(selectIsLoading);
  const error = useSelector(selectError);
  const tokens = useSelector(selectTokens);
  const permissions = useSelector(selectPermissions);
  const sessionTimeRemaining = useSelector(selectSessionTimeRemainingMinutes);

  const handleClearError = () => {
    dispatch(clearError());
  };

  const handleLogout = () => {
    dispatch(logoutUser());
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">PKC Authentication Test</h1>
        <p className="text-gray-600">
          Test your Authentik integration with PKC
        </p>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Authentication Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            {isAuthenticated ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-green-600 font-medium">Authenticated</span>
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-red-500" />
                <span className="text-red-600 font-medium">Not Authenticated</span>
              </>
            )}
          </div>

          {isLoading && (
            <div className="text-blue-600">
              Authentication in progress...
            </div>
          )}

          {error && (
            <div className="space-y-2">
              <p className="text-red-600 bg-red-50 p-3 rounded">{error}</p>
              <Button variant="outline" size="sm" onClick={handleClearError}>
                Clear Error
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Login Section */}
      {!isAuthenticated && (
        <Card>
          <CardHeader>
            <CardTitle>Login to PKC</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Click the button below to authenticate with Authentik at{' '}
              <code className="bg-gray-100 px-2 py-1 rounded text-sm">auth.pkc.pub</code>
            </p>
            <LoginButton fullWidth />
            
            <div className="text-sm text-gray-500 space-y-1">
              <p><strong>Expected flow:</strong></p>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>Click "Login with Authentik"</li>
                <li>Redirect to auth.pkc.pub</li>
                <li>Enter your credentials</li>
                <li>Redirect back to callback</li>
                <li>Return here authenticated</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      )}

      {/* User Information */}
      {isAuthenticated && user && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* User Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>User Profile</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <UserProfile showSessionInfo variant="full" />
            </CardContent>
          </Card>

          {/* Session & Technical Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Key className="h-5 w-5" />
                <span>Technical Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Session Remaining:</span>
                  <Badge variant="outline">
                    {sessionTimeRemaining} minutes
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Has Access Token:</span>
                  <Badge variant={tokens?.accessToken ? "default" : "destructive"}>
                    {tokens?.accessToken ? "Yes" : "No"}
                  </Badge>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Has Refresh Token:</span>
                  <Badge variant={tokens?.refreshToken ? "default" : "destructive"}>
                    {tokens?.refreshToken ? "Yes" : "No"}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <span className="text-gray-600">Permissions:</span>
                  <div className="flex flex-wrap gap-1">
                    {permissions.length > 0 ? (
                      permissions.map(permission => (
                        <Badge key={permission} variant="secondary" className="text-xs">
                          {permission}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-gray-400 text-sm">None</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-gray-600">User Groups:</span>
                  <div className="flex flex-wrap gap-1">
                    {user.groups.length > 0 ? (
                      user.groups.map(group => (
                        <Badge key={group} variant="outline" className="text-xs">
                          {group}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-gray-400 text-sm">None</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={handleLogout}
                  className="w-full"
                >
                  Test Logout
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Debug Info */}
      <Card>
        <CardHeader>
          <CardTitle>Debug Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>Environment:</strong> {import.meta.env.NODE_ENV || 'development'}</p>
            <p><strong>Authentik URL:</strong> {import.meta.env.AUTHENTIK_URL || 'Not set'}</p>
            <p><strong>Client ID:</strong> {import.meta.env.AUTHENTIK_CLIENT_ID ? 'Set' : 'Not set'}</p>
            <p><strong>Client Secret:</strong> {import.meta.env.AUTHENTIK_CLIENT_SECRET ? 'Set' : 'Not set'}</p>
            <p><strong>Expected Callback:</strong> http://localhost:4321/auth/callback</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
