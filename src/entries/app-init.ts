// Client entry: bundles all runtime initializations so Vite rewrites paths for prod
import '@/utils/pkcutils-init.ts';
import '@/store/preload-state.ts';
import '@/store/initializer.ts';
import '@/services/preload-entry.ts';

// Bridge: expose content-type utils consistently for browser scripts
import * as ContentUtils from '@/utils/content-type-utils.ts';

// Attach to global
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g: any = window as any;
g.PKCUtils = g.PKCUtils || {};
g.PKCUtils.content = g.PKCUtils.content || { ...ContentUtils };

// Signal readiness
console.log('✅ PKC app-init loaded');
window.dispatchEvent(new CustomEvent('pkg-ready'));
