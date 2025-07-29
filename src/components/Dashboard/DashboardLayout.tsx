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
      <div className="relative flex min-h-screen flex-col bg-background">
        <TopBar title="PKC">
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

        <div className="flex-1 flex overflow-hidden">
          {/* Mobile Sidebar Overlay */}
          {isMobile && isMobileSidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
          )}

          <ResizablePanelGroup 
            direction={isMobile ? "vertical" : "horizontal"}
            className="flex-1 relative"
          >
            {/* Sidebar */}
            <div 
              ref={sidebarRef}
              className={cn(
                'transition-transform duration-300 ease-in-out',
                'fixed inset-y-0 left-0 z-50 w-64',
                'md:relative md:translate-x-0',
                isMobile ? [
                  'transform',
                  isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full',
                  'bg-background shadow-lg',
                  'h-screen',
                ] : ''
              )}
              style={{
                transitionProperty: 'transform',
                transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
                transitionDuration: '300ms',
              }}
            >
              <ResizablePanel 
                defaultSize={getSidebarSize()}
                minSize={isMobile ? 100 : 15}
                maxSize={isMobile ? 100 : 30}
                collapsedSize={0}
                collapsible
                className="h-full"
              >
                <div className="h-full">
                  <Sidebar 
                    activePanel={activePanel} 
                    onPanelChange={handlePanelChange} 
                  />
                </div>
              </ResizablePanel>
            </div>
            
            {!isMobile && <ResizableHandle withHandle />}
            
            {/* Main Content */}
            <ResizablePanel 
              defaultSize={100 - getSidebarSize()}
              className={cn(
                'transition-all duration-300',
                isMobile && isMobileSidebarOpen && 'opacity-50 pointer-events-none',
                'md:opacity-100 md:pointer-events-auto',
                'h-full',
                'overflow-auto',
                'p-4 md:p-6',
                'bg-background',
                'min-h-[calc(100vh-4rem)]' // Account for the header height
              )}
            >
              <Panels activePanel={activePanel} />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    </ThemeProvider>
  );
}
