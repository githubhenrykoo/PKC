// Simple Pocketflow event bus (pub/sub)
export type Unsubscribe = () => void;
export type Listener<T = any> = (payload: T) => void;

class PocketflowBus {
  private listeners: Map<string, Set<Listener>> = new Map();

  publish<T = any>(topic: string, payload: T): void {
    const ls = this.listeners.get(topic);
    if (ls) {
      ls.forEach((fn) => {
        try { fn(payload); } catch (e) { console.warn('Pocketflow listener error for', topic, e); }
      });
    }
  }

  subscribe<T = any>(topic: string, listener: Listener<T>): Unsubscribe {
    if (!this.listeners.has(topic)) this.listeners.set(topic, new Set());
    const set = this.listeners.get(topic)!;
    set.add(listener as Listener);
    return () => set.delete(listener as Listener);
  }
}

export const pocketflow = new PocketflowBus();

// Expose globally for debugging
if (typeof window !== 'undefined') {
  (window as any).pocketflow = pocketflow;
}
