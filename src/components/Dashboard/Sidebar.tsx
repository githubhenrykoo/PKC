import React from 'react';
import { cn } from "@/lib/utils";
import { type PanelType } from './Panels';

interface SidebarProps {
  className?: string;
  activePanel: PanelType;
  onPanelChange: (panel: PanelType) => void;
}

interface NavLinkProps {
  panel: PanelType;
  icon: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
  onClick: (panel: PanelType) => void;
}

function NavLink({ panel, icon, children, active = false, onClick }: NavLinkProps) {
  return (
    <button 
      type="button"
      onClick={() => onClick(panel)}
      className={cn(
        "group flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-left",
        active 
          ? "bg-accent text-accent-foreground" 
          : "hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <span className="mr-2 h-4 w-4">{icon}</span>
      <span>{children}</span>
    </button>
  );
}

export function Sidebar({ className, activePanel, onPanelChange }: SidebarProps) {
  return (
    <aside className={cn(
      "fixed top-14 z-30 -ml-2 hidden h-[calc(100vh-3.5rem)] w-full shrink-0 border-r md:sticky md:block",
      className
    )}>
      <div className="h-full py-6 pl-8 pr-6 lg:py-8">
        <nav className="grid items-start gap-2">
          <NavLink 
            panel="mcard"
            icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1Z" />
            </svg>}
            active={activePanel === 'mcard'}
            onClick={onPanelChange}
          >
            MCard Browser
          </NavLink>
          
          <NavLink 
            panel="analytics"
            icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" />
              <path d="m19 9-5 5-4-4-3 3" />
            </svg>}
            active={activePanel === 'analytics'}
            onClick={onPanelChange}
          >
            Analytics
          </NavLink>
          
          <NavLink 
            panel="settings"
            icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>}
            active={activePanel === 'settings'}
            onClick={onPanelChange}
          >
            Settings
          </NavLink>
          
          <NavLink 
            panel="help"
            icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <path d="M12 17h.01" />
            </svg>}
            active={activePanel === 'help'}
            onClick={onPanelChange}
          >
            Help & Support
          </NavLink>
        </nav>
      </div>
    </aside>
  );
}
