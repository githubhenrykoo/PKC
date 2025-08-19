// Ambient type declarations for PWA install prompt
// Makes the non-standard beforeinstallprompt event available to TypeScript

export {};

declare global {
  interface BeforeInstallPromptEvent extends Event {
    readonly platforms?: string[];
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform?: string }>;
  }

  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}
