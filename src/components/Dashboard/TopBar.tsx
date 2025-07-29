import React from 'react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, User } from 'lucide-react';
import { cn } from "@/lib/utils";

interface TopBarProps {
  title?: string;
  children?: React.ReactNode;
}

export function TopBar({ title = 'PKC', children }: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center space-x-2 md:space-x-4">
          {children}
          <h1 className="text-lg font-semibold md:text-xl">{title}</h1>
        </div>
        <div className="flex items-center space-x-1 md:space-x-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full h-10 w-10"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full h-10 w-10"
            aria-label="User menu"
          >
            <User className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
