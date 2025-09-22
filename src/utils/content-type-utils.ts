// Shared content type utilities for icons, labels, and inference
// Keeps UI consistent across components and minimizes duplication.
// NOTE: Public exports and behavior preserved. Internals refactored for reuse.

export type IconOptions = {
  width?: number;
  height?: number;
  className?: string;
  strokeWidth?: number;
};

/**
 * Return a small label chip HTML for a content-type. Safe to insert with set:html.
 */
export const getTypePillHTML = (ct?: string): string => {
  const label = getTypeLabel(ct);
  return `<span class="ml-1 text-[10px] px-1 py-0.5 rounded bg-black/5 dark:bg-white/10 align-middle">${label}</span>`;
};

/**
 * Convenience: icon + type pill (without title). Useful when composing nav items.
 */
export const getIconWithPillHTML = (ct?: string, opts: IconOptions = {}): string => {
  return `${getTypeIconSvg(ct, opts)} ${getTypePillHTML(ct)}`.trim();
};

// Strip file extension from filename
const stripExtension = (name?: string): string | undefined => {
  if (!name) return undefined;
  return name.replace(/\.[^/.]+$/, '');
};

// -------------------------
// Internal helpers and maps
// -------------------------

// Central extension -> MIME map for easy extension in one place
export const EXT_TO_MIME: Record<string, string> = {
  md: 'text/markdown',
  markdown: 'text/markdown',
  txt: 'text/plain',
  json: 'application/json',
  js: 'application/javascript',
  html: 'text/html',
  htm: 'text/html',
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  mp4: 'video/mp4'
};

// Content-types that should be treated as text (not binary) besides text/*
const NON_BINARY_CT = new Set([
  'application/json',
  'application/javascript',
  'text/html',
  'text/markdown'
]);

// Label mapping for exact content types
export const MIMETYPE_LABELS: Record<string, string> = {
  'application/pdf': 'PDF',
  'text/markdown': 'MD',
  'text/plain': 'TXT',
  'application/json': 'JSON',
  'application/javascript': 'JS',
  'text/html': 'HTML'
};

// Human-friendly names for common content-types
const MIMETYPE_FRIENDLY: Record<string, string> = {
  'application/pdf': 'PDF',
  'text/markdown': 'Markdown',
  'text/plain': 'Text',
  'application/json': 'JSON',
  'application/javascript': 'JavaScript',
  'text/html': 'HTML',
  'image/png': 'PNG',
  'image/jpeg': 'JPEG'
};

// Normalize and sanitize a content-type value
const normalizeContentType = (ct?: string): string | undefined => {
  if (!ct || typeof ct !== 'string') return undefined;
  return ct.toLowerCase();
};

// Build SVG base attributes consistently
const makeSvgBase = (opts: IconOptions = {}): string => {
  const width = opts.width ?? 21;
  const height = opts.height ?? 21;
  const strokeWidth = opts.strokeWidth ?? 1.8;
  const cls = opts.className ?? 'inline-block mr-2 -mt-0.5 align-middle opacity-80';
  return `class="${cls}" width="${width}" height="${height}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"`;
};

/**
 * Best-effort content-type inference from a filename's extension.
 */
export const inferContentTypeFromFilename = (filename?: string): string | undefined => {
  if (!filename || typeof filename !== 'string') return undefined;
  const ext = filename.toLowerCase().split('.').pop() || '';
  return EXT_TO_MIME[ext];
};

/**
 * Heuristic check if a content-type should be treated as binary in our UI.
 * Unknown treats as text for safer rendering.
 */
export const isBinary = (ct?: string): boolean => {
  const n = normalizeContentType(ct);
  if (!n) return false;
  if (n.startsWith('text/')) return false;
  if (NON_BINARY_CT.has(n)) return false;
  return true;
};

/**
 * Short label string used in chips/badges.
 */
export const getTypeLabel = (ct?: string): string => {
  const n = normalizeContentType(ct);
  if (!n) return 'TXT';
  if (n.startsWith('image/')) return 'IMG';
  if (n.startsWith('video/')) return 'VID';
  if (n.startsWith('audio/')) return 'AUD';
  return MIMETYPE_LABELS[n] ?? (isBinary(n) ? 'BLOB' : 'TXT');
};

/**
 * Small inline SVG icon representing a content-type.
 */
export const getTypeIconSvg = (ct?: string, opts: IconOptions = {}): string => {
  const base = makeSvgBase(opts);
  const n = normalizeContentType(ct);

  if (!n) {
    return `<svg ${base}><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`;
  }

  if (n.startsWith('image/')) {
    return `<svg ${base}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="1.5"/><path d="M3 17l5-5 4 4 3-3 4 4"/></svg>`;
  }
  if (n.startsWith('video/')) {
    return `<svg ${base}><rect x="3" y="3" width="18" height="18" rx="2"/><polygon points="10,9 16,12 10,15"/></svg>`;
  }
  if (n.startsWith('audio/')) {
    // Use the sidebar's audio icon variant for consistency
    return `<svg ${base}><path d="M12 5v8"/><circle cx="9" cy="15" r="2"/><circle cx="15" cy="13" r="2"/></svg>`;
  }

  switch (n) {
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
/**
 * Resolve a single, effective content-type from available metadata and filename.
 * Falls back to filename inference, then to provided default (text/plain).
 */
export const resolveEffectiveContentType = (
  meta?: { content_type?: string; contentType?: string; filename?: string },
  defaultType: string = 'text/plain'
): string => {
  const ct = normalizeContentType(meta?.content_type || meta?.contentType);
  const inferred = inferContentTypeFromFilename(meta?.filename);
  return (ct && String(ct)) || inferred || defaultType;
};

// Normalize a content-type to a renderer key used by UI renderers
export type RendererType = 'markdown' | 'html' | 'json' | 'image' | 'pdf' | 'text' | 'unknown';
export const getRendererTypeFromContentType = (contentType?: string): RendererType => {
  const type = normalizeContentType(contentType) || '';
  if (type.includes('markdown')) return 'markdown';
  if (type.includes('html')) return 'html';
  if (type.includes('application/json')) return 'json';
  if (type.startsWith('image/')) return 'image';
  if (type.includes('application/pdf')) return 'pdf';
  if (type.startsWith('text/')) return 'text';
  return 'unknown';
};

// -------------------------
// Shared title generation
// -------------------------

export type TitleSource = {
  filename?: string;
  metadata?: { title?: string } | null;
  content_type?: string;
  contentType?: string;
  hash?: string;
};

/**
 * Generate a consistent display title from metadata/filename/content-type.
 * New format: [icon] <TYPE_LABEL> <shortHash>
 * - TYPE_LABEL comes from MIMETYPE_LABELS (falls back to getTypeLabel)
 * - shortHash is max 10 chars with ... in the middle
 */
export const generateDisplayTitle = (src: TitleSource, index?: number): string => {
  // Helper: shorten a string with center ellipsis to a maximum length
  const shortenMiddle = (s: string, max: number = 12): string => {
    if (!s) return '';
    if (s.length <= max) return s;
    const keep = max - 3; // account for '...'
    const front = Math.ceil(keep / 2);
    const back = Math.floor(keep / 2);
    return `${s.slice(0, front)}...${s.slice(-back)}`;
  };

  // Short hash or reasonable fallback
  const h = src?.hash || '';
  const shortHash = h ? shortenMiddle(h, 12) : '';

  // Return only the shortened hash per requirement
  return shortHash;
};
