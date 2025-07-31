import React from 'react';
import { cn } from "@/lib/utils";
import { type PanelType } from './Panels';
import { useMediaQuery } from '@/hooks/useMediaQuery';

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
    <li className="mb-2">
      <button
        onClick={() => onClick(panel)}
        className={cn(
          "flex items-center w-full px-4 py-3 text-sm font-medium rounded-md transition-all",
          "active:scale-95 transform transition-transform duration-150",
          active
            ? "bg-blue-600 text-white shadow-sm dark:bg-blue-700"
            : "bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-blue-600",
          "touch-manipulation" // Optimize for touch devices
        )}
        aria-current={active ? 'page' : undefined}
      >
        <span className="mr-3 flex-shrink-0">{icon}</span>
        <span className="text-left">{children}</span>
      </button>
    </li>
  );
}

export function Sidebar({ className, activePanel, onPanelChange }: SidebarProps) {
  return (
    <aside className={cn("h-full overflow-y-auto p-4 md:p-6", className)}>
      <nav>
        <ul className="space-y-2">
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
            panel="rag"
            icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 12 2c-3.3 0-6 2.7-6 6 0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5"/>
              <path d="M9 18h6"/>
              <path d="M10 22h4"/>
            </svg>}
            active={activePanel === 'rag'}
            onClick={onPanelChange}
          >
            RAG Intelligence
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
        </ul>
      </nav>
      
      {/* Add some bottom padding on mobile to account for browser UI */}
      <div className="h-16 md:h-0"></div>
    </aside>
  );
}
