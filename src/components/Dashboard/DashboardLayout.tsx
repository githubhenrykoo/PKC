import React, { useState, useEffect, useRef } from 'react';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { Panels, type PanelType } from './Panels';
import { ThemeProvider } from "@/context/ThemeContext";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Button } from "@/components/ui/button";
import { PanelLeft, X } from 'lucide-react';
import { cn } from "@/lib/utils";

// Define the client directive props for Astro compatibility
interface DashboardLayoutProps {
  title?: string;
  'client:load'?: boolean;
  'client:idle'?: boolean;
  'client:visible'?: boolean;
  'client:media'?: string;
}

export function DashboardLayout({ title = "PKC Dashboard" }: DashboardLayoutProps) {
  const [activePanel, setActivePanel] = useState<PanelType>('mcard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
  const sidebarRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const handlePanelChange = (panel: PanelType) => {
    setActivePanel(panel);
    if (isMobile) {
      setIsMobileSidebarOpen(false);
    }
  };

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (!isMobile || !isMobileSidebarOpen) return;
      
      const target = event.target as Node;
      const clickedOutsideSidebar = sidebarRef.current && !sidebarRef.current.contains(target);
      const clickedOnMenuButton = menuButtonRef.current && menuButtonRef.current.contains(target);
      
      if (clickedOutsideSidebar && !clickedOnMenuButton) {
        setIsMobileSidebarOpen(false);
      }
    };

    // Add both mouse and touch events for better mobile support
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside as EventListener);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside as EventListener);
    };
  }, [isMobile, isMobileSidebarOpen]);

  // Auto-close sidebar when switching to mobile view
  useEffect(() => {
    if (!isMobile) {
      setIsMobileSidebarOpen(false);
    }
  }, [isMobile]);

  // Determine sidebar size based on device
  const getSidebarSize = () => {
    if (isMobile) return 100; // Full screen on mobile
    if (isTablet) return 30;  // Smaller on tablet
    return 20;                // Default on desktop
  };

  return (
    <ThemeProvider>
      <div className="flex flex-col h-screen bg-background">
        {/* Fixed TopBar */}
        <div className="fixed top-0 left-0 right-0 z-40 h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <TopBar title="PKC" client:load>
            <Button 
              ref={menuButtonRef}
              variant="ghost" 
              size="icon" 
              className="md:hidden"
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              aria-label="Toggle menu"
              aria-expanded={isMobileSidebarOpen}
            >
              {isMobileSidebarOpen ? <X className="h-5 w-5" /> : <PanelLeft className="h-5 w-5" />}
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </TopBar>
        </div>

        <div className="flex flex-1 pt-16">
          {/* Mobile Sidebar Overlay */}
          {isMobile && isMobileSidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
          )}

          {/* Fixed Sidebar */}
          <div 
            ref={sidebarRef}
            className={cn(
              'fixed top-16 bottom-0 left-0 z-30 w-64 border-r bg-background transition-transform duration-300 ease-in-out',
              'md:translate-x-0',
              isMobile ? [
                'transform',
                isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full',
                'shadow-lg',
              ] : ''
            )}
            style={{
              transitionProperty: 'transform',
              transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
              transitionDuration: '300ms',
            }}
          >
            <div className="h-full overflow-y-auto">
              <Sidebar 
                activePanel={activePanel} 
                onPanelChange={handlePanelChange} 
              />
            </div>
          </div>
          
          {/* Main Content */}
          <div 
            className={cn(
              'flex-1 transition-all duration-300 overflow-auto',
              'pt-4 md:pt-6',
              'pl-4 md:pl-6',
              'pr-4 md:pr-6',
              'pb-4 md:pb-6',
              'ml-0 md:ml-64', // Offset for sidebar on desktop
              isMobile && isMobileSidebarOpen ? 'opacity-50 pointer-events-none' : 'opacity-100',
              'h-[calc(100vh-4rem)]' // Full height minus header
            )}
          >
            <Panels activePanel={activePanel} />
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}
