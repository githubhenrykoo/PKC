import React from 'react';
import { MCardBrowser } from "@/components/Mcard/MCardBrowser";

// Panel types
export type PanelType = 'mcard' | 'settings' | 'analytics' | 'help';

interface PanelsProps {
  activePanel: PanelType;
}

export function Panels({ activePanel }: PanelsProps) {
  return (
    <div className="flex w-full flex-1 flex-col overflow-hidden py-8 px-4">
      {/* MCard Browser Panel */}
      {activePanel === 'mcard' && (
        <MCardBrowser />
      )}

      {/* Settings Panel */}
      {activePanel === 'settings' && (
        <div className="space-y-6">
          <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
          <div className="rounded-lg border bg-card p-6">
            <p className="text-muted-foreground">
              Application settings will be displayed here.
            </p>
          </div>
        </div>
      )}

      {/* Analytics Panel */}
      {activePanel === 'analytics' && (
        <div className="space-y-6">
          <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
          <div className="rounded-lg border bg-card p-6">
            <p className="text-muted-foreground">
              Analytics and data visualizations will be displayed here.
            </p>
          </div>
        </div>
      )}

      {/* Help Panel */}
      {activePanel === 'help' && (
        <div className="space-y-6">
          <h2 className="text-3xl font-bold tracking-tight">Help & Support</h2>
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
