import React from 'react';
import { Button } from "@/components/ui/button";
import { LogIn } from 'lucide-react';
import { cn } from "@/lib/utils";

// Define the client directive props for Astro compatibility
interface TopBarProps {
  title?: string;
  children?: React.ReactNode;
  'client:load'?: boolean;
  'client:idle'?: boolean;
  'client:visible'?: boolean;
  'client:media'?: string;
}

// Simple TopBar actions with login functionality - no Redux dependency
function TopBarActions() {
  console.log('🔧 TopBarActions component is rendering!');
  
  const handleLogin = async () => {
    // Debug environment variables
    console.log('🔍 Environment Variables Debug:');
    console.log('PUBLIC_AUTHENTIK_URL:', import.meta.env.PUBLIC_AUTHENTIK_URL);
    console.log('PUBLIC_AUTHENTIK_CLIENT_ID:', import.meta.env.PUBLIC_AUTHENTIK_CLIENT_ID);
    console.log('PUBLIC_MCARD_API_URL:', import.meta.env.PUBLIC_MCARD_API_URL);
    
    try {
      // Import auth service dynamically to avoid Redux dependency
      const { authService } = await import('@/services/auth-service');
      await authService.loginWithAuthentik();
    } catch (error) {
      console.error('Login failed:', error);
      // Fallback: direct redirect to Authentik
      const authUrl = import.meta.env.PUBLIC_AUTHENTIK_URL || 'https://auth.pkc.pub';
      const clientId = import.meta.env.PUBLIC_AUTHENTIK_CLIENT_ID || 'YQ6Us24EhfFoQjIabvpuTZM8CJjdG0t52TjHM3jz';
      const redirectUri = `${window.location.origin}/auth/callback`;
      
      console.log('🔐 Login URL components:');
      console.log('Auth URL:', authUrl);
      console.log('Client ID:', clientId);
      console.log('Redirect URI:', redirectUri);
      
      // Create properly formatted OAuth 2.0 authorization URL
      const state = Date.now().toString();
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: 'openid profile email',
        state: state
      });
      const loginUrl = `${authUrl}/application/o/authorize/?${params.toString()}`;
      console.log('🚀 Full login URL:', loginUrl);
      
      window.location.href = loginUrl;
    }
  };

  return (
    <div className="flex items-center space-x-1 md:space-x-2">
      <div className="flex items-center space-x-2">
        <Button variant="outline" size="sm" onClick={handleLogin}>
          <LogIn className="h-4 w-4 mr-2" />
          Login with Authentik
        </Button>
      </div>
    </div>
  );
}

export function TopBar({ title = 'PKC', children }: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center space-x-2 md:space-x-4">
          {children}
          <h1 className="text-lg font-semibold md:text-xl">{title}</h1>
        </div>
        <TopBarActions />
      </div>
    </header>
  );
}
