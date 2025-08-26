---
created: 2025-08-24T01:00:50+08:00
modified: 2025-08-24T01:00:50+08:00
title: Content Viewer Architecture Documentation
subject: content-viewer, architecture, renderer-registry, PKC, frontend
---

# Content Viewer Architecture Documentation

This document explains the architecture, organization, and rendering pipeline of the PKC content viewer system.

## Overview

The content viewer system consists of a main orchestrator component and a registry-based renderer system that can handle multiple content types. It's designed to be extensible, maintainable, and efficient.

## System Components

### Main Components

```
src/components/layout/functional/
├── dynamic-content-viewer.astro     # Main orchestrator component
└── navigation_sidebar.astro         # Selection source (covered in selection-flow.md)

src/components/Mcard/content_type_viewer/
├── renderer-registry.json           # Central registry of available renderers
├── index.ts                         # Helper functions and TypeScript types
├── RendererRegistry.astro           # Developer documentation component
├── MarkdownRenderer.astro           # Markdown content renderer
├── HtmlRenderer.astro              # HTML content renderer
├── JsonRenderer.astro              # JSON content renderer
├── ImageRenderer.astro             # Image content renderer
├── PdfRenderer.astro               # PDF content renderer
├── TextRenderer.astro              # Plain text renderer
└── UnknownRenderer.astro           # Fallback for unsupported types
```

### Utility Components

```
src/utils/
└── content-type-utils.ts            # Shared content type detection and utilities
```

## Architecture Overview

```mermaid
graph TD
    A[Navigation Sidebar] -->|window.loadMCardContent(hash, title)| C[Dynamic Content Viewer]
    C -->|Load Content| D[MCard API]
    D -->|Metadata + Content| C
    C -->|Select Renderer| E[Renderer Registry]
    E -->|Component Info| C
    C -->|Render| F[Specific Renderer Component]
    F -->|Initialize| G[Client-side Enhancement]
    
    subgraph "Renderer Registry System"
        E
        H[renderer-registry.json]
        I[Helper Functions]
        J[TypeScript Types]
    end
    
    subgraph "Available Renderers"
        F1[MarkdownRenderer]
        F2[HtmlRenderer]
        F3[JsonRenderer]
        F4[ImageRenderer]
        F5[PdfRenderer]
        F6[TextRenderer]
        F7[UnknownRenderer]
    end
```

## Core Architecture Principles

### 1. Registry-Based Component System

**Central Registry**: `renderer-registry.json` maintains a mapping of content types to renderer components:

```json
{
  "renderers": {
    "text/markdown": {
      "component": "MarkdownRenderer",
      "path": "@/components/Mcard/content_type_viewer/MarkdownRenderer.astro",
      "description": "Renders Markdown content with syntax highlighting"
    },
    "application/pdf": {
      "component": "PdfRenderer",
      "path": "@/components/Mcard/content_type_viewer/PdfRenderer.astro",
      "description": "Renders PDF documents with preview and download"
    }
  },
  "fallback": {
    "component": "UnknownRenderer",
    "path": "@/components/Mcard/content_type_viewer/UnknownRenderer.astro",
    "description": "Default renderer for unsupported content types"
  }
}
```

**Benefits**:
- Easy to add new content type support
- Centralized configuration
- Self-documenting through the registry
- Type-safe with TypeScript interfaces

### 2. Two-Stage Rendering Pipeline

**Stage 1: Server-Side Component Selection**
- Registry determines appropriate renderer component
- Attempts server-side rendering via API endpoint
- Falls back to client-side rendering if needed

**Stage 2: Client-Side Enhancement**
- Initializes renderer-specific functionality
- Loads external libraries (Marked, DOMPurify, KaTeX)
- Applies interactive features and event handlers

### 3. Space-Aware Layout System

**Full Height Utilization**:
```css
.dynamic-content-viewer {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.content-body {
  flex: 1;          /* Takes all available space */
  overflow: auto;   /* Scrollable if content overflows */
}

#renderer-slot {
  height: 100%;     /* Full height within content body */
}
```

**Renderer Responsibility**: Each renderer is responsible for using available space efficiently:
- PDF renderer: `h-full w-full flex flex-col` with `flex-1` for iframe
- Image renderer: `max-w-full max-h-full object-contain`
- Text renderers: Scrollable content areas

## Content Loading Pipeline

### 1. Selection Trigger
```javascript
// From navigation sidebar via direct call
if (typeof window.loadMCardContent === 'function') {
  window.loadMCardContent(hash, title || 'MCard Content');
}
```

### 2. Content Loading Process

```javascript
window.loadMCardContent = async (hash, title) => {
  // 1. Show loading state
  showLoading();
  
  // 2. Fetch metadata from MCard API
  const metadata = await fetch(`${baseUrl}/card/${hash}/metadata`);
  
  // 3. Resolve effective content type
  const effectiveType = resolveEffectiveContentType({
    content_type: metadata.content_type,
    filename: metadata.filename
  });
  
  // 4. Update UI with metadata
  setTitleWithIcon(effectiveType, displayTitle);
  
  // 5. Determine renderer type
  const rendererType = getRendererType(effectiveType);
  
  // 6. Fetch content (if text-based)
  const content = isTextContent ? 
    await fetch(`${baseUrl}/card/${hash}/content?as_text=true`) : 
    null;
  
  // 7. Render using appropriate component
  await renderContentWithComponent(rendererType, content, hash, metadata, effectiveType);
  
  // 8. Hide loading state
  hideLoading();
}
```

### 3. Rendering Strategy

```javascript
const renderContentWithComponent = async (rendererType, content, hash, metadata, contentType) => {
  try {
    // Attempt server-side component rendering
    const response = await fetch('/api/renderer', {
      method: 'POST',
      body: JSON.stringify({ rendererType, hash, metadata, contentType })
    });
    
    if (response.ok) {
      rendererSlot.innerHTML = await response.text();
    } else {
      throw new Error('Server rendering failed');
    }
  } catch (error) {
    // Fallback to client-side inline rendering
    await renderComponentInline(rendererType, content, hash, metadata, contentType);
  }
  
  // Initialize renderer-specific functionality
  await initializeRenderer(rendererType, content, hash);
};
```

## Renderer Component Architecture

### Base Renderer Structure

Each renderer component follows this pattern:

```astro
---
// Component Props Interface
interface Props {
  hash: string;
  metadata?: any;
  content?: string;  // For text-based renderers
}

const { hash, metadata, content } = Astro.props as Props;
---

<div class="[renderer-type]-renderer h-full w-full" data-hash={hash}>
  <!-- Renderer-specific HTML structure -->
</div>

<script is:inline define:vars={{ hash }}>
  // Client-side initialization logic
  document.addEventListener('DOMContentLoaded', () => {
    // Renderer-specific setup
  });
</script>

<style>
  /* Renderer-specific styling */
  .[renderer-type]-renderer {
    /* Ensure proper space utilization */
  }
</style>
```

### Renderer Types and Capabilities

#### 1. **MarkdownRenderer**
- **Purpose**: Renders Markdown content with syntax highlighting
- **Libraries**: Marked.js, DOMPurify, KaTeX (for math)
- **Features**: 
  - GitHub-flavored markdown
  - LaTeX math rendering
  - Syntax highlighting
  - Sanitized HTML output

#### 2. **HtmlRenderer**
- **Purpose**: Renders HTML content safely
- **Libraries**: DOMPurify, KaTeX
- **Features**:
  - XSS protection via sanitization
  - Math formula support
  - Responsive layout

#### 3. **JsonRenderer**
- **Purpose**: Pretty-prints JSON with syntax highlighting
- **Libraries**: Native JSON parsing
- **Features**:
  - Formatted JSON display
  - Error handling for malformed JSON
  - Monospace font styling

#### 4. **ImageRenderer**
- **Purpose**: Displays images with proper scaling
- **Libraries**: Native HTML img element
- **Features**:
  - Responsive image scaling
  - Lazy loading
  - Centered display
  - Shadow effects

#### 5. **PdfRenderer** (Enhanced)
- **Purpose**: PDF document preview and access
- **Libraries**: Native iframe + fallback
- **Features**:
  - **Primary**: Iframe-based PDF preview
  - **Fallback**: Download/external view options
  - **Full height utilization**: Takes maximum available space
  - **Action buttons**: Compact bottom toolbar
  - **Error handling**: Graceful degradation

#### 6. **TextRenderer**
- **Purpose**: Plain text with basic formatting
- **Libraries**: Marked.js, DOMPurify, KaTeX
- **Features**:
  - Treats plain text as lightweight Markdown
  - Line break preservation
  - Basic formatting support

#### 7. **UnknownRenderer**
- **Purpose**: Fallback for unsupported content types
- **Libraries**: None
- **Features**:
  - Content type identification
  - Download link generation
  - User-friendly error messaging

## External Library Management

### Dynamic Library Loading

```javascript
const ensureRenderLibs = async () => {
  if (!window.__renderLibs) {
    window.__renderLibs = (async () => {
      // Local-first, CDN fallback strategy
      const libraries = [
        { name: 'marked', global: 'marked', urls: ['/vendor/marked/marked.min.js', 'https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js'] },
        { name: 'DOMPurify', global: 'DOMPurify', urls: ['/vendor/dompurify/purify.min.js', 'https://cdn.jsdelivr.net/npm/dompurify@3.1.6/dist/purify.min.js'] },
        { name: 'katex', global: 'katex', urls: ['/vendor/katex/katex.min.js', 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js'] }
      ];
      
      // Load each library with fallback chain
      for (const lib of libraries) {
        await tryLoadFromSources(lib.urls, lib.global);
      }
      
      return { marked: window.marked, DOMPurify: window.DOMPurify, katex: window.katex };
    })();
  }
  return window.__renderLibs;
};
```

### Library Usage Patterns

**Markdown Rendering**:
```javascript
const libs = await ensureRenderLibs();
const rawHtml = libs.marked.parse(content);
const safeHtml = libs.DOMPurify.sanitize(rawHtml);
container.innerHTML = safeHtml;

// Math rendering
libs.renderMathInElement(container, {
  delimiters: [
    {left: '$$', right: '$$', display: true},
    {left: '$', right: '$', display: false}
  ]
});
```

## Error Handling and Resilience

### 1. Library Loading Failures
- Multiple CDN fallbacks
- Graceful degradation to basic rendering
- Timeout protection
- User notification of issues

### 2. Content Loading Failures
- API error handling
- Network timeout management
- User-friendly error messages
- Retry mechanisms

### 3. Renderer Failures
- Component-specific error boundaries
- Fallback to UnknownRenderer
- Content download alternatives
- Debug information in console

## Performance Optimizations

### 1. Lazy Loading
- External libraries loaded on-demand
- Image lazy loading
- Component initialization only when needed

### 2. Caching
- Library loading cached in `window.__renderLibs`
- Renderer registry cached
- API responses can be cached by browser

### 3. Resource Management
- Cleanup of event listeners
- Memory-efficient rendering
- Minimal DOM manipulation

## Extensibility Guide

### Adding New Content Type Support

1. **Create Renderer Component**:
```astro
---
// src/components/Mcard/content_type_viewer/MyNewRenderer.astro
interface Props {
  hash: string;
  metadata?: any;
  content?: string;
}
---
<div class="mynew-renderer h-full w-full" data-hash={hash}>
  <!-- Your renderer HTML -->
</div>
```

2. **Update Registry**:
```json
{
  "renderers": {
    "application/my-type": {
      "component": "MyNewRenderer",
      "path": "@/components/Mcard/content_type_viewer/MyNewRenderer.astro",
      "description": "Renders my custom content type"
    }
  }
}
```

3. **Update Content Type Utils**:
```typescript
// Add to getRendererTypeFromContentType()
if (contentType.includes('application/my-type')) return 'mynew';
```

4. **Add Initialization Logic**:
```javascript
// In dynamic-content-viewer.astro
case 'mynew':
  await initializeMyNewRenderer(content, hash);
  break;
```

## Integration with Navigation System

The content viewer integrates with the navigation sidebar through a direct global function call. See `selection-flow.md` for details about:

- Sidebar click → direct `window.loadMCardContent()` invocation
- Data contract between components
- Resilience and error handling

## Development and Debugging

### Debug Console Output

The content viewer provides comprehensive logging:

```javascript
console.log('🎯 Content viewer initializing...');
console.log('🔄 Loading MCard content for hash:', hash);
console.log('📚 Render libraries loaded:', { marked: !!libs.marked });
console.log('✅ Content loaded successfully');
```

### Developer Tools

Use the `RendererRegistry.astro` component to view available renderers:

```astro
---
import RendererRegistry from '@/components/Mcard/content_type_viewer/RendererRegistry.astro';
---
<RendererRegistry showCode={true} />
```

### Registry Helper Functions

```typescript
import { 
  getRendererForContentType, 
  getSupportedContentTypes,
  isContentTypeSupported 
} from '@/components/Mcard/content_type_viewer';

// Get renderer info
const renderer = getRendererForContentType('application/pdf');

// Check support
const isSupported = isContentTypeSupported('text/markdown');

// List all types
const allTypes = getSupportedContentTypes();
```

## Future Improvements

### Planned Enhancements
- Server-side rendering API endpoint
- Component preloading
- Advanced PDF features (page navigation, search)
- Video/audio renderer support
- Collaborative editing integration

### Performance Targets
- < 100ms initial render time
- < 500ms library loading time
- < 50ms renderer switching time
- Minimal memory footprint

## References

- **Selection Flow**: `selection-flow.md` - How navigation communicates with viewer
- **Content Type Utils**: `src/utils/content-type-utils.ts` - Shared utilities
- **MCard API Rules**: See `.windsurf/rules/mcard-rules.md` - Data access patterns
- **Component Registry**: Live documentation at `/renderer-registry` endpoint

This architecture provides a robust, extensible, and maintainable foundation for content viewing in the PKC system.
