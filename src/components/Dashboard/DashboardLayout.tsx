import React, { useState } from 'react';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { Panels, type PanelType } from './Panels';
import { ThemeProvider } from "@/context/ThemeContext";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

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

  const handlePanelChange = (panel: PanelType) => {
    setActivePanel(panel);
  };

  return (
    <ThemeProvider>
    <div className="relative flex min-h-screen flex-col">
      <TopBar title="PKC" />

      <div className="flex-1">
        <ResizablePanelGroup direction="horizontal" className="min-h-[calc(100vh-4rem)]">
          {/* Sidebar */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
            <Sidebar 
              activePanel={activePanel} 
              onPanelChange={handlePanelChange} 
            />
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          {/* Main Content */}
          <ResizablePanel defaultSize={80}>
            <Panels activePanel={activePanel} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  </ThemeProvider>
  );
}
