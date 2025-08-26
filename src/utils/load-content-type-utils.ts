// Standard loader that dynamically imports content-type utilities
// Provides unified fallbacks to reduce boilerplate across components

export type ContentTypeUtils = {
  inferContentTypeFromFilename: (filename?: string) => string | undefined;
  getTypeLabel: (contentType?: string) => string;
  getTypeIconSvg: (contentType?: string) => string;
  getTypePillHTML: (contentType?: string) => string;
  resolveEffectiveContentType: (meta?: any) => string;
  getRendererTypeFromContentType: (ct?: string) => string;
  generateDisplayTitle: (src?: any, index?: number) => string;
};

export async function loadContentTypeUtils(): Promise<ContentTypeUtils> {
  try {
    const utils = await import('./content-type-utils.ts');
    const {
      inferContentTypeFromFilename,
      getTypeLabel,
      getTypeIconSvg,
      getTypePillHTML,
      resolveEffectiveContentType,
      getRendererTypeFromContentType,
      generateDisplayTitle,
    } = utils as any;

    return {
      inferContentTypeFromFilename,
      getTypeLabel,
      getTypeIconSvg,
      getTypePillHTML,
      resolveEffectiveContentType,
      getRendererTypeFromContentType,
      generateDisplayTitle,
    };
  } catch (e) {
    // Unified fallbacks
    const inferContentTypeFromFilename = (_filename?: string) => undefined;
    const getTypeLabel = (_ct?: string) => 'Document';
    const getTypeIconSvg = (_ct?: string) => '📄';
    const getTypePillHTML = (contentType?: string) =>
      `<span class="ml-1 text-[10px] px-1 py-0.5 rounded bg-black/5 dark:bg-white/10 align-middle">${getTypeLabel(
        contentType
      )}</span>`;
    const resolveEffectiveContentType = (meta?: any) =>
      meta?.content_type || meta?.contentType || inferContentTypeFromFilename(meta?.filename) || 'text/plain';
    const getRendererTypeFromContentType = (ct?: string) => {
      const t = (ct || '').toLowerCase();
      if (t.includes('markdown')) return 'markdown';
      if (t.includes('html')) return 'html';
      if (t.includes('application/json')) return 'json';
      if (t.startsWith('image/')) return 'image';
      if (t.includes('application/pdf')) return 'pdf';
      if (t.startsWith('text/')) return 'text';
      return 'unknown';
    };
    const generateDisplayTitle = (src?: any, index?: number) => {
      const name = src?.filename?.replace(/\.[^/.]+$/, '');
      if (name) return name;
      if (src?.metadata?.title) return src.metadata.title as string;
      const base = 'Document';
      if (typeof index === 'number') return `${base} ${index + 1}`;
      if (src?.hash) return `${base} ${String(src.hash).substring(0, 8)}`;
      return base;
    };

    return {
      inferContentTypeFromFilename,
      getTypeLabel,
      getTypeIconSvg,
      getTypePillHTML,
      resolveEffectiveContentType,
      getRendererTypeFromContentType,
      generateDisplayTitle,
    };
  }
}
