// Extend the Window interface to include PWA-related properties
declare interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare interface WindowEventMap {
  beforeinstallprompt: BeforeInstallPromptEvent;
  appinstalled: Event;
}

// Declare the global variable for the deferred prompt
interface Window {
  deferredPrompt?: BeforeInstallPromptEvent;
}
