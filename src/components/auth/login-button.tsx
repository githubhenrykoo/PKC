import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from '@/components/ui/button';
import { Loader2, LogIn } from 'lucide-react';
import { loginWithAuthentik } from '@/store/slices';
import { selectIsLoading, selectError } from '@/store/selectors';
import type { AppDispatch } from '@/store';

interface LoginButtonProps {
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  fullWidth?: boolean;
}

export function LoginButton({ 
  variant = 'default', 
  size = 'default', 
  className = '',
  fullWidth = false 
}: LoginButtonProps) {
  const dispatch = useDispatch<AppDispatch>();
  const isLoading = useSelector(selectIsLoading);
  const error = useSelector(selectError);

  const handleLogin = () => {
    dispatch(loginWithAuthentik());
  };

  return (
    <div className={`space-y-2 ${fullWidth ? 'w-full' : ''}`}>
      <Button
        onClick={handleLogin}
        disabled={isLoading}
        variant={variant}
        size={size}
        className={`${fullWidth ? 'w-full' : ''} ${className}`}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Connecting...
          </>
        ) : (
          <>
            <LogIn className="mr-2 h-4 w-4" />
            Login with Authentik
          </>
        )}
      </Button>
      
      {error && (
        <p className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
