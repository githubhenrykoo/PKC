// Expose browser-safe utilities on window for inline scripts
// This avoids dynamic importing TS modules from inline scripts, which can cause 404s.

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
    PKCUtils?: {
      content: {
        inferContentTypeFromFilename: typeof inferContentTypeFromFilename;
        getTypeLabel: typeof getTypeLabel;
        getTypeIconSvg: typeof getTypeIconSvg;
        getTypePillHTML: typeof getTypePillHTML;
        resolveEffectiveContentType: typeof resolveEffectiveContentType;
        getRendererTypeFromContentType: typeof getRendererTypeFromContentType;
        generateDisplayTitle: typeof generateDisplayTitle;
      };
      list: {
        debounce: typeof debounce;
        paginate: typeof paginate;
        formatNavItemHTML: typeof formatNavItemHTML;
      };
    };
  }
}

window.PKCUtils = window.PKCUtils || {
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

// Signal that PKCUtils is ready
console.log('🔧 PKCUtils bootstrap module imported');
window.dispatchEvent(new CustomEvent('PKCUtilsReady'));
