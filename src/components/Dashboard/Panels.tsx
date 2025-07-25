import React from 'react';
import { MCardBrowser } from "@/components/Mcard/MCardBrowser";

// Panel types
export type PanelType = 'mcard' | 'settings' | 'analytics' | 'help';

interface PanelsProps {
  activePanel: PanelType;
}

export function Panels({ activePanel }: PanelsProps) {
  return (
    <div className="flex w-full h-full flex-col overflow-hidden">
      {/* MCard Browser Panel */}
      {activePanel === 'mcard' && (
        <div className="h-full w-full">
          <MCardBrowser />
        </div>
      )}

      {/* Settings Panel */}
      {activePanel === 'settings' && (
        <div className="h-full w-full p-6">
          <h2 className="text-3xl font-bold tracking-tight mb-6">Settings</h2>
          <div className="rounded-lg border bg-card p-6">
            <p className="text-muted-foreground">
              Application settings will be displayed here.
            </p>
          </div>
        </div>
      )}

      {/* Analytics Panel */}
      {activePanel === 'analytics' && (
        <div className="h-full w-full p-6">
          <h2 className="text-3xl font-bold tracking-tight mb-6">Analytics</h2>
          <div className="rounded-lg border bg-card p-6">
            <p className="text-muted-foreground">
              Analytics and data visualizations will be displayed here.
            </p>
          </div>
        </div>
      )}

      {/* Help Panel */}
      {activePanel === 'help' && (
        <div className="h-full w-full p-6">
          <h2 className="text-3xl font-bold tracking-tight mb-6">Help & Support</h2>
          <div className="rounded-lg border bg-card p-6">
            <p className="text-muted-foreground">
              Help documentation and support resources will be displayed here.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
