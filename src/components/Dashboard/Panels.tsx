import React from 'react';
import { MCardBrowser } from "@/components/Mcard/MCardBrowser";
import { RAGBrowser } from "@/components/RAG/RAGBrowser";
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { cn } from "@/lib/utils";

// Panel types
export type PanelType = 'mcard' | 'rag' | 'settings' | 'analytics' | 'help';

interface PanelsProps {
  activePanel: PanelType;
  className?: string;
}

const PanelContainer: React.FC<{
  title: string;
  children: React.ReactNode;
  className?: string;
}> = ({ title, children, className }) => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  return (
    <div className={cn("h-full w-full overflow-auto", className)}>
      <div className={cn(
        "mx-auto w-full",
        isMobile ? "p-4" : "p-6"
      )}>
        <h2 className={cn(
          "font-bold tracking-tight mb-6 text-foreground",
          isMobile ? "text-2xl" : "text-3xl"
        )}>
          {title}
        </h2>
        <div className="rounded-lg border bg-card shadow-sm">
          <div className={cn("p-4", !isMobile && "p-6")}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export function Panels({ activePanel, className }: PanelsProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <div className={cn(
      "flex w-full h-full flex-col overflow-hidden",
      className
    )}>
      {/* MCard Browser Panel */}
      {activePanel === 'mcard' && (
        <div className="h-full w-full overflow-hidden">
          <MCardBrowser />
        </div>
      )}

      {/* RAG Panel */}
      {activePanel === 'rag' && (
        <div className="h-full w-full overflow-hidden">
          <RAGBrowser />
        </div>
      )}

      {/* Settings Panel */}
      {activePanel === 'settings' && (
        <PanelContainer title="Settings">
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Application settings will be displayed here.
            </p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-24 rounded-lg bg-muted/50 flex items-center justify-center">
                  <span className="text-muted-foreground">Setting {i}</span>
                </div>
              ))}
            </div>
          </div>
        </PanelContainer>
      )}

      {/* Analytics Panel */}
      {activePanel === 'analytics' && (
        <PanelContainer title="Analytics">
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[
                { label: 'Total Views', value: '1,234' },
                { label: 'Active Users', value: '567' },
                { label: 'Engagement', value: '78%' },
              ].map((stat, i) => (
                <div key={i} className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              ))}
            </div>
            <div className="h-64 rounded-lg bg-muted/50 flex items-center justify-center">
              <span className="text-muted-foreground">Analytics Chart</span>
            </div>
          </div>
        </PanelContainer>
      )}

      {/* Help Panel */}
      {activePanel === 'help' && (
        <PanelContainer title="Help & Support">
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Frequently Asked Questions</h3>
              <div className="space-y-2">
                {[
                  'How do I get started?',
                  'Where can I find my documents?',
                  'How do I change my password?',
                ].map((question, i) => (
                  <div key={i} className="rounded-lg border p-4 hover:bg-accent/50 transition-colors cursor-pointer">
                    <p className="font-medium">{question}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="pt-4 border-t">
              <p className="text-muted-foreground">
                Need more help? Contact our support team at support@example.com
              </p>
            </div>
          </div>
        </PanelContainer>
      )}
    </div>
  );
}
