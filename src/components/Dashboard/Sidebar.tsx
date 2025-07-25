import React, { useEffect, useState } from 'react';
import { cn } from "@/lib/utils";

interface SidebarProps {
  className?: string;
}

interface NavLinkProps {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
}

// Make sure active has a definite false default to match server rendering
function NavLink({ href, icon, children, active = false }: NavLinkProps) {
  return (
    <a 
      href={href} 
      className={cn(
        "group flex items-center rounded-md px-3 py-2 text-sm font-medium",
        active 
          ? "bg-accent text-accent-foreground" 
          : "hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <span className="mr-2 h-4 w-4">{icon}</span>
      <span>{children}</span>
    </a>
  );
}

export function Sidebar({ className }: SidebarProps) {
  // Initial state matches what server would render - no active state
  const [path, setPath] = useState('');
  
  // Update path after component mounts on client side only
  useEffect(() => {
    setPath(window.location.pathname);
  }, []);
  
  return (
    <aside className={cn(
      "fixed top-14 z-30 -ml-2 hidden h-[calc(100vh-3.5rem)] w-full shrink-0 border-r md:sticky md:block",
      className
    )}>
      <div className="h-full py-6 pl-8 pr-6 lg:py-8">
        <nav className="grid items-start gap-2">
          <NavLink 
            href="/dashboard" 
            icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>} 
            active={path === '/dashboard'}
          >
            Dashboard
          </NavLink>
          <NavLink 
            href="/dashboard/files" 
            icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>} 
            active={path === '/dashboard/files'}
          >
            Files
          </NavLink>
          <NavLink 
            href="/dashboard/cards" 
            icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <line x1="2" x2="22" y1="10" y2="10" />
            </svg>} 
            active={path === '/dashboard/cards'}
          >
            Cards
          </NavLink>
          <NavLink 
            href="/dashboard/settings" 
            icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>} 
            active={path === '/dashboard/settings'}
          >
            Settings
          </NavLink>
        </nav>
      </div>
    </aside>
  );
}
