// Content Type Viewer Registry - Central export for renderer system
import rendererRegistry from './renderer-registry.json';

// Export the registry data
export { rendererRegistry };

// Export types for TypeScript support
export interface RendererInfo {
  component: string;
  path: string;
  description: string;
}

export interface RendererRegistry {
  renderers: Record<string, RendererInfo>;
  fallback: RendererInfo;
  metadata: {
    version: string;
    lastUpdated: string;
    description: string;
  };
}

// Helper function to get renderer for content type
export function getRendererForContentType(contentType: string): RendererInfo {
  const renderers = rendererRegistry.renderers as Record<string, RendererInfo>;
  return renderers[contentType] || rendererRegistry.fallback;
}

// Helper function to get all supported content types
export function getSupportedContentTypes(): string[] {
  return Object.keys(rendererRegistry.renderers);
}

// Helper function to check if content type is supported
export function isContentTypeSupported(contentType: string): boolean {
  return contentType in rendererRegistry.renderers;
}
