import React from 'react';
import { Panel } from '@/components/Panel/Panel';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { StatusMessageToaster } from '@/components/ui/status-message';

export interface MainPageProps {
  // Add any props you might need to pass from the Astro file
  'client:load'?: boolean;
  'client:idle'?: boolean;
  'client:visible'?: boolean;
  'client:media'?: string;
}

export function MainPage({}: MainPageProps) {
  return (
    <>
      <ThemeToggle />
      <StatusMessageToaster />

      <div className="container mx-auto max-w-6xl px-4 py-8 md:py-16 flex flex-col items-center justify-center min-h-screen">
        <main className="w-full">
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-extrabold mb-2 bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">
              Welcome to PKC
            </h1>
            <p className="text-lg text-muted-foreground">
              Interactive Experience
            </p>
          </div>
          
          <div className="flex justify-center">
            <Panel 
              imageSrc="/images/gasing.png"
              imageAlt="Gasing"
              redirectUrl="/welcome"
            />
          </div>
        </main>
      </div>
    </>
  );
}
