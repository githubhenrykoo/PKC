// Shared types for MCard-related UI and data structures
// Keeping this file additive only; no imports into existing files yet.

export type MCardHash = string;

export interface MCardMetadata {
  filename?: string;
  title?: string;
  content_type?: string;
  g_time?: string;
  hash?: MCardHash;
  // Allow extra fields without breaking
  [key: string]: unknown;
}

export interface MCardNavItem {
  id: string; // can mirror hash or derived id
  title: string;
  content?: string;
  contentType?: string;
  filename?: string;
  gTime?: string;
  hash?: MCardHash;
}

export interface PaginationResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface RenderableNavItem {
  title: string;
  contentType?: string;
  hash?: string;
  gTime?: string;
}
