// Single centralized PKCUtils initialization
// This runs once at app startup and ensures everything is ready before components initialize

import {
  inferContentTypeFromFilename,
  getTypeLabel,
  getTypeIconSvg,
  getTypePillHTML,
  resolveEffectiveContentType,
  getRendererTypeFromContentType,
  generateDisplayTitle,
} from './content-type-utils';

import { debounce, paginate, formatNavItemHTML } from './list-format';

// Augment the Window type
declare global {
  interface Window {
    PKCUtilsReady: boolean;
  }
}

// Initialize PKCUtils immediately
window.PKCUtils = {
  content: {
    inferContentTypeFromFilename,
    getTypeLabel,
    getTypeIconSvg,
    getTypePillHTML,
    resolveEffectiveContentType,
    getRendererTypeFromContentType,
    generateDisplayTitle,
  },
  list: {
    debounce,
    paginate,
    formatNavItemHTML,
  },
};

window.PKCUtilsReady = true;
console.log('🔧 PKCUtils initialized and ready');
