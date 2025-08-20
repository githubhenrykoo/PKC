// Shared content type utilities for icons, labels, and inference
// Keeps UI consistent across components and minimizes duplication.

export type IconOptions = {
  width?: number;
  height?: number;
  className?: string;
  strokeWidth?: number;
};

export const inferContentTypeFromFilename = (filename?: string): string | undefined => {
  if (!filename || typeof filename !== 'string') return undefined;
  const ext = filename.toLowerCase().split('.').pop() || '';
  switch (ext) {
    case 'md':
    case 'markdown':
      return 'text/markdown';
    case 'txt':
      return 'text/plain';
    case 'json':
      return 'application/json';
    case 'js':
      return 'application/javascript';
    case 'html':
    case 'htm':
      return 'text/html';
    case 'pdf':
      return 'application/pdf';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'gif':
      return 'image/gif';
    case 'mp3':
      return 'audio/mpeg';
    case 'wav':
      return 'audio/wav';
    case 'mp4':
      return 'video/mp4';
    default:
      return undefined;
  }
};

export const isBinary = (ct?: string): boolean => {
  if (!ct) return false; // Unknown -> treat as text for safety
  if (ct.startsWith('text/')) return false;
  if (
    ct === 'application/json' ||
    ct === 'application/javascript' ||
    ct === 'text/html' ||
    ct === 'text/markdown'
  )
    return false;
  return true;
};

export const getTypeLabel = (ct?: string): string => {
  if (!ct) return 'TXT';
  if (ct.startsWith('image/')) return 'IMG';
  if (ct.startsWith('video/')) return 'VID';
  if (ct.startsWith('audio/')) return 'AUD';
  switch (ct) {
    case 'application/pdf':
      return 'PDF';
    case 'text/markdown':
      return 'MD';
    case 'text/plain':
      return 'TXT';
    case 'application/json':
      return 'JSON';
    case 'application/javascript':
      return 'JS';
    case 'text/html':
      return 'HTML';
    default:
      return isBinary(ct) ? 'BLOB' : 'TXT';
  }
};

export const getTypeIconSvg = (ct?: string, opts: IconOptions = {}): string => {
  const width = opts.width ?? 21;
  const height = opts.height ?? 21;
  const strokeWidth = opts.strokeWidth ?? 1.8;
  const cls = opts.className ?? 'inline-block mr-2 -mt-0.5 align-middle opacity-80';
  const base = `class="${cls}" width="${width}" height="${height}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"`;

  if (!ct) {
    return `<svg ${base}><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`;
  }

  if (ct.startsWith('image/')) {
    return `<svg ${base}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="1.5"/><path d="M3 17l5-5 4 4 3-3 4 4"/></svg>`;
  }
  if (ct.startsWith('video/')) {
    return `<svg ${base}><rect x="3" y="3" width="18" height="18" rx="2"/><polygon points="10,9 16,12 10,15"/></svg>`;
  }
  if (ct.startsWith('audio/')) {
    // Use the sidebar's audio icon variant for consistency
    return `<svg ${base}><path d="M12 5v8"/><circle cx="9" cy="15" r="2"/><circle cx="15" cy="13" r="2"/></svg>`;
  }

  switch (ct) {
    case 'application/pdf':
      return `<svg ${base}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h2a2 2 0 0 1 0 4H8z"/><path d="M13 17v-4h2a2 2 0 0 1 0 4z"/></svg>`;
    case 'text/markdown':
      return `<svg ${base}><rect x="3" y="7" width="18" height="10" rx="2"/><path d="M7 15V9l2 2 2-2v6"/><path d="M15 15V9"/></svg>`;
    case 'text/plain':
      return `<svg ${base}><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/></svg>`;
    case 'application/json':
      return `<svg ${base}><path d="M8 3H6a3 3 0 0 0-3 3v2"/><path d="M16 3h2a3 3 0 0 1 3 3v2"/><path d="M3 16v2a3 3 0 0 0 3 3h2"/><path d="M21 16v2a3 3 0 0 1-3 3h-2"/><circle cx="12" cy="12" r="2"/></svg>`;
    case 'application/javascript':
      return `<svg ${base}><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 16V8M16 16v-5a3 3 0 0 0-3-3h-1"/></svg>`;
    case 'text/html':
      return `<svg ${base}><path d="M10 3H4l2 14 6 4 6-4 2-14h-6"/><path d="M7 8h10M8 12h8"/></svg>`;
    default:
      return `<svg ${base}><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`;
  }
};

// Resolve a single, effective content-type from available metadata and filename
// Falls back to filename inference, then to provided default (text/plain)
export const resolveEffectiveContentType = (
  meta?: { content_type?: string; contentType?: string; filename?: string },
  defaultType: string = 'text/plain'
): string => {
  const ct = meta?.content_type || meta?.contentType;
  const inferred = inferContentTypeFromFilename(meta?.filename);
  return (ct && String(ct)) || inferred || defaultType;
};

// Normalize a content-type to a renderer key used by UI renderers
export type RendererType = 'markdown' | 'html' | 'json' | 'image' | 'pdf' | 'text' | 'unknown';
export const getRendererTypeFromContentType = (contentType?: string): RendererType => {
  const type = (contentType || '').toLowerCase();
  if (type.includes('markdown')) return 'markdown';
  if (type.includes('html')) return 'html';
  if (type.includes('application/json')) return 'json';
  if (type.startsWith('image/')) return 'image';
  if (type.includes('application/pdf')) return 'pdf';
  if (type.startsWith('text/')) return 'text';
  return 'unknown';
};
