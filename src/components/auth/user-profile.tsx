import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Settings, 
  LogOut, 
  Shield, 
  Clock,
  ChevronDown 
} from 'lucide-react';
import { logoutUser, openModal } from '@/store/slices';
import { 
  selectUser, 
  selectUserDisplayName, 
  selectUserInitials, 
  selectUserRoles,
  selectIsAdmin,
  selectSessionTimeRemainingMinutes 
} from '@/store/selectors';
import type { AppDispatch } from '@/store';

interface UserProfileProps {
  showSessionInfo?: boolean;
  variant?: 'full' | 'compact' | 'avatar-only';
}

export function UserProfile({ 
  showSessionInfo = false, 
  variant = 'full' 
}: UserProfileProps) {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector(selectUser);
  const displayName = useSelector(selectUserDisplayName);
  const initials = useSelector(selectUserInitials);
  const roles = useSelector(selectUserRoles);
  const isAdmin = useSelector(selectIsAdmin);
  const sessionTimeRemaining = useSelector(selectSessionTimeRemainingMinutes);

  if (!user) return null;

  const handleLogout = () => {
    dispatch(logoutUser());
  };

  const handleSettings = () => {
    dispatch(openModal('settings'));
  };

  const handleProfile = () => {
    dispatch(openModal('profile'));
  };

  if (variant === 'avatar-only') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.avatar} alt={displayName || user.email} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{displayName}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleProfile}>
            <User className="mr-2 h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSettings}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (variant === 'compact') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-auto p-2">
            <div className="flex items-center space-x-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={user.avatar} alt={displayName || user.email} />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{displayName}</span>
              <ChevronDown className="h-3 w-3" />
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end">
          <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleProfile}>
            <User className="mr-2 h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSettings}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Full variant
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <Avatar className="h-12 w-12">
          <AvatarImage src={user.avatar} alt={displayName || user.email} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <h3 className="font-semibold">{displayName}</h3>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <div className="flex items-center space-x-2">
            {isAdmin && (
              <Badge variant="secondary" className="text-xs">
                <Shield className="mr-1 h-3 w-3" />
                Admin
              </Badge>
            )}
            {roles.slice(0, 2).map(role => (
              <Badge key={role} variant="outline" className="text-xs">
                {role.replace('pkc_', '').replace('_', ' ')}
              </Badge>
            ))}
            {roles.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{roles.length - 2} more
              </Badge>
            )}
          </div>
        </div>
      </div>

      {showSessionInfo && (
        <div className="text-xs text-muted-foreground flex items-center space-x-1">
          <Clock className="h-3 w-3" />
          <span>
            Session expires in {sessionTimeRemaining} minutes
          </span>
        </div>
      )}

      <div className="flex space-x-2">
        <Button variant="outline" size="sm" onClick={handleProfile}>
          <User className="mr-2 h-4 w-4" />
          Profile
        </Button>
        <Button variant="outline" size="sm" onClick={handleSettings}>
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </Button>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}
