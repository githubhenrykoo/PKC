import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface TopBarProps {
  title?: string;
}

export function TopBar({ title = 'PKC' }: TopBarProps) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  useEffect(() => {
    // Initialize theme state
    const isDark = document.documentElement.classList.contains('dark-theme');
    setIsDarkMode(isDark);
  }, []);
  
  const toggleTheme = () => {
    const newIsDarkMode = !isDarkMode;
    setIsDarkMode(newIsDarkMode);
    document.documentElement.classList.toggle('dark-theme', newIsDarkMode);
  };
  
  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="container flex h-16 items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-primary">{title}</h1>
        </div>
        <div className="flex items-center gap-4">
          <Button 
            variant="secondary" 
            size="icon" 
            onClick={toggleTheme}
            className="border border-gray-400 shadow-sm"
          >
            {isDarkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3a6.364 6.364 0 0 0 9 9 9 9 0 1 1-9-9Z" />
              </svg>
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>
          
          <Button variant="outline" size="icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            <span className="sr-only">Notifications</span>
          </Button>
          
          <Avatar>
            <AvatarImage src="https://via.placeholder.com/40" alt="User Avatar" />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
