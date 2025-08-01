import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { LogIn, User, LogOut } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

// Function to get runtime environment variables directly from window.RUNTIME_ENV
const getRuntimeEnv = () => {
  if (typeof window !== 'undefined' && window.RUNTIME_ENV) {
    console.log('✅ Using window.RUNTIME_ENV:', window.RUNTIME_ENV);
    return window.RUNTIME_ENV;
  }
  console.log('❌ window.RUNTIME_ENV not available, using fallback');
  return {};
};

// TopBar actions with authentication state - no Redux dependency
function TopBarActions() {
  console.log('🔧 TopBarActions component is rendering!');
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [runtimeEnvLoaded, setRuntimeEnvLoaded] = useState(false);
  
  // Wait for runtime environment variables to be loaded
  useEffect(() => {
    const checkRuntimeEnv = () => {
      if (typeof window !== 'undefined' && window.RUNTIME_ENV) {
        console.log('✅ Runtime environment loaded:', Object.keys(window.RUNTIME_ENV));
        setRuntimeEnvLoaded(true);
      } else {
        console.log('⏳ Waiting for runtime environment...');
        // Keep checking every 100ms until runtime env is loaded
        setTimeout(checkRuntimeEnv, 100);
      }
    };
    
    // Listen for runtime env loaded event
    const handleRuntimeEnvLoaded = () => {
      console.log('📡 Runtime env loaded event received');
      setRuntimeEnvLoaded(true);
    };
    
    window.addEventListener('runtime-env-loaded', handleRuntimeEnvLoaded);
    checkRuntimeEnv();
    
    return () => {
      window.removeEventListener('runtime-env-loaded', handleRuntimeEnvLoaded);
    };
  }, []);
  
  // Check authentication status on component mount
  useEffect(() => {
    const checkAuthStatus = () => {
      const authenticated = localStorage.getItem('pkc_authenticated') === 'true';
      const userInfo = localStorage.getItem('pkc_user');
      
      console.log('🔍 Checking auth status:', { authenticated, userInfo: !!userInfo });
      
      if (authenticated && userInfo) {
        try {
          const parsedUser = JSON.parse(userInfo);
          setUser(parsedUser);
          setIsAuthenticated(true);
          console.log('✅ User authenticated:', parsedUser);
        } catch (error) {
          console.error('❌ Error parsing user info:', error);
          // Clear invalid data
          localStorage.removeItem('pkc_authenticated');
          localStorage.removeItem('pkc_user');
        }
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    };
    
    // Check on mount
    checkAuthStatus();
    
    // Listen for storage changes (e.g., from other tabs)
    window.addEventListener('storage', checkAuthStatus);
    
    return () => {
      window.removeEventListener('storage', checkAuthStatus);
    };
  }, []);
  
  const handleLogin = async () => {
    console.log('🔍 Environment Variables Debug:');
    
    // Get environment variables directly from window.RUNTIME_ENV
    const runtimeEnv = getRuntimeEnv();
    console.log('🌍 Runtime Environment:', runtimeEnv);
    console.log('PUBLIC_AUTHENTIK_URL:', runtimeEnv.PUBLIC_AUTHENTIK_URL);
    console.log('PUBLIC_AUTHENTIK_CLIENT_ID:', runtimeEnv.PUBLIC_AUTHENTIK_CLIENT_ID);
    console.log('PUBLIC_AUTHENTIK_REDIRECT_URI:', runtimeEnv.PUBLIC_AUTHENTIK_REDIRECT_URI);
    console.log('PUBLIC_MCARD_API_URL:', runtimeEnv.PUBLIC_MCARD_API_URL);
    
    // Use runtime environment variables
    const authUrl = runtimeEnv.PUBLIC_AUTHENTIK_URL;
    const clientId = runtimeEnv.PUBLIC_AUTHENTIK_CLIENT_ID;
    const redirectUri = runtimeEnv.PUBLIC_AUTHENTIK_REDIRECT_URI;
    
    console.log('🔑 Using values:');
    console.log('- Auth URL:', authUrl);
    console.log('- Client ID:', clientId);
    console.log('- Redirect URI:', redirectUri);
    
    if (!authUrl || !clientId || !redirectUri) {
      console.error('❌ Missing runtime environment variables:', { authUrl, clientId, redirectUri });
      alert('Authentication configuration error. Please check environment variables.');
      return;
    }
    
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
  };
  
  const handleLogout = () => {
    console.log('🚪 Logging out user');
    localStorage.removeItem('pkc_authenticated');
    localStorage.removeItem('pkc_user');
    setIsAuthenticated(false);
    setUser(null);
    // Refresh the page to reset any cached state
    window.location.reload();
  };

  // Show user profile if authenticated
  if (isAuthenticated && user) {
    const displayName = user.firstName && user.lastName 
      ? `${user.firstName} ${user.lastName}` 
      : user.username || user.email || 'User';
    const initials = user.firstName && user.lastName 
      ? `${user.firstName[0]}${user.lastName[0]}` 
      : displayName[0]?.toUpperCase() || 'U';
    
    return (
      <div className="flex items-center space-x-1 md:space-x-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatar} alt={displayName} />
                <AvatarFallback className="bg-primary text-primary-foreground">{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-card text-card-foreground border-border" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none text-foreground">{displayName}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // Show loading if runtime env is not loaded yet
  if (!runtimeEnvLoaded) {
    return (
      <div className="flex items-center space-x-1 md:space-x-2">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }
  
  // Show login button if not authenticated
  return (
    <div className="flex items-center space-x-1 md:space-x-2">
      <div className="flex items-center space-x-2">
        <Button variant="default" size="sm" onClick={handleLogin} className="bg-primary text-primary-foreground hover:bg-primary/90">
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
