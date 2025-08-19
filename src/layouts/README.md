# PKC Responsive Layout System

## Overview

The PKC (Personal/Progressive Knowledge Container) layout system implements a triadic card-based architecture using modern CSS Grid and Flexbox. The system provides a responsive shell that adapts from mobile-first vertical stacking to horizontal multi-column layouts.

## Architecture

### Core Components

- **AppShell.astro** - Main layout container with responsive grid system
- **Topbar.astro** - Header component with authentication and theme controls
- **Sidebar.astro** - Left navigation panel (optional)
- **RightPanel.astro** - Right utility panel (optional)  
- **Footer.astro** - Full-width footer component

### Layout Structure

```
┌─────────────────────────────────────┐
│              Header                 │
├─────────────────────────────────────┤
│  ┌─────┐ ┌─────────┐ ┌─────────┐    │
│  │Side │ │ Content │ │  Right  │    │ ← Three middle panels
│  │bar  │ │  Area   │ │  Panel  │    │
│  │     │ │         │ │         │    │
│  └─────┘ └─────────┘ └─────────┘    │
├─────────────────────────────────────┤
│              Footer                 │
└─────────────────────────────────────┘
```

## Responsive Behavior

### Mobile (< 768px)
- **Vertical Stacking**: Three middle panels stack in separate rows
- **Order**: Sidebar → Content → Right Panel
- **Spacing**: Configurable gap between panels (default: 1px)
- **Min Height**: 200px per panel for usability
- **Footer**: Full-width at bottom

### Medium Screens (≥ 768px)
- **Horizontal Layout**: Panels arrange side-by-side
- **Single Row**: All panels share grid row 1
- **Adaptive Columns**: Grid columns adjust based on content presence
- **Sidebar Widths**: Responsive using `clamp()` functions

### Large Screens (≥ 1024px)
- **Three-Column Layout**: When both sidebars have content
- **Optimized Widths**: Balanced sidebar and content proportions

## Technical Implementation

### CSS Grid Structure

```css
/* CSS Custom Properties */
:root {
  --panel-gap: 1px; /* Configurable gap between panels */
}

/* Mobile-first: Vertical stacking */
.app-container {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: auto auto auto;
  row-gap: var(--panel-gap);
  column-gap: var(--panel-gap);
}

/* Medium+: Horizontal layout */
@media (min-width: 768px) {
  .app-container {
    grid-template-rows: 1fr;
    /* gap values remain consistent across breakpoints */
  }
}
```

### Panel Positioning

```css
/* Mobile stacking order */
.app-sidebar { grid-row: 1; }
.app-content { grid-row: 2; }
.app-right { grid-row: 3; }

/* Horizontal layout */
@media (min-width: 768px) {
  .app-sidebar, .app-content, .app-right {
    grid-row: 1;
  }
}
```

### Responsive Column Widths

```css
/* Single sidebar configurations */
.app-container:has(.app-sidebar:not(:empty)):not(:has(.app-right:not(:empty))) {
  grid-template-columns: clamp(150px, 14vw, 190px) minmax(0, 1fr);
}

.app-container:has(.app-right:not(:empty)):not(:has(.app-sidebar:not(:empty))) {
  grid-template-columns: minmax(0, 1fr) clamp(160px, 15vw, 200px);
}

/* Dual sidebar configuration */
.app-container:has(.app-sidebar:not(:empty)):has(.app-right:not(:empty)) {
  grid-template-columns: clamp(160px, 14vw, 190px) minmax(0, 1fr) clamp(160px, 15vw, 200px);
}
```

## Key Features

### 1. Vertical Stretching
- Three middle panels expand to fill available viewport height
- Footer pushed to bottom when content is short
- Natural scrolling when content overflows

### 2. Full-Width Footer
- Footer spans entire viewport width
- Positioned outside grid container
- Always visible at page bottom

### 3. Adaptive Sidebar Widths
- Responsive `clamp()` functions prevent oversized sidebars
- Viewport-based sizing with min/max constraints
- Content-aware column generation using `:has()` selectors

### 4. Configurable Panel Spacing
- CSS custom property `--panel-gap` controls spacing between panels
- Default value: 1px for minimal visual separation
- Consistent across all responsive breakpoints
- Easily customizable for different design requirements

### 5. Content Overflow Handling
- Panels use `overflow: hidden` to contain content
- Internal content areas use `overflow: auto` for scrolling
- `min-height: 0` allows proper flex calculations

## Usage Guidelines

### Basic Implementation

```astro
---
import AppShell from '../layouts/AppShell.astro';
import Topbar from '../components/layout/topbar.astro';
import Sidebar from '../components/layout/sidebar.astro';
import RightPanel from '../components/layout/right-panel.astro';
import Footer from '../components/layout/footer.astro';
---

<AppShell title="Page Title">
  <Topbar slot="header" title="Page Title" />
  <Sidebar slot="sidebar" />
  <RightPanel slot="right" />
  <Footer slot="footer" />
  
  <!-- Main content goes here -->
  <section class="flex flex-col p-6">
    <h1>Content</h1>
  </section>
</AppShell>
```

### Optional Panels

Panels can be omitted and the layout will adapt:

```astro
<!-- Content-only layout -->
<AppShell title="Simple Page">
  <Topbar slot="header" title="Simple Page" />
  <Footer slot="footer" />
  
  <section class="flex flex-col p-6">
    <h1>Full-width content</h1>
  </section>
</AppShell>
```

### Content Structure

Content within panels should use flexbox for proper stretching:

```astro
<!-- Sidebar content -->
<nav class="flex flex-col space-y-4">
  <a href="/">Home</a>
  <a href="/about">About</a>
</nav>

<!-- Main content -->
<section class="flex flex-col p-6">
  <header class="mb-6">
    <h1>Page Title</h1>
  </header>
  <main class="flex-1">
    <!-- Content that can grow -->
  </main>
</section>
```

### Customizing Panel Spacing

To adjust the gap between panels, override the CSS custom property:

```css
/* Custom panel spacing examples */
:root {
  --panel-gap: 0px;    /* No gap - seamless panels */
  --panel-gap: 2px;    /* Minimal separation */
  --panel-gap: 4px;    /* Small gap */
  --panel-gap: 8px;    /* Medium gap */
  --panel-gap: 1rem;   /* Large gap */
}
```

Or apply it inline for specific pages:

```astro
<style>
  :root {
    --panel-gap: 4px;
  }
</style>
```

## Debug Features

### Visual Boundaries
Temporary debug borders are included for development:

```css
.app-header { outline: 2px dashed #7c3aed66; }  /* Purple */
.app-sidebar { outline: 2px dashed #2563eb66; } /* Blue */
.app-content { outline: 2px dashed #ea580c66; } /* Orange */
.app-right { outline: 2px dashed #16a34a66; }   /* Green */
.app-footer { outline: 2px dashed #ef444466; }  /* Red */
```

Remove these outlines in production by deleting the debug section in `AppShell.astro`.

## Performance Considerations

### CSS Grid Advantages
- Hardware-accelerated layout calculations
- Minimal reflows during responsive transitions
- Efficient content-aware column generation

### Flexbox Integration
- Optimal content distribution within panels
- Natural overflow handling
- Smooth height calculations

### Modern CSS Features
- `:has()` selectors for content-aware layouts
- `clamp()` functions for responsive sizing
- CSS custom properties for theming

## Browser Support

- **Modern Browsers**: Full support (Chrome 88+, Firefox 87+, Safari 14+)
- **CSS Grid**: Required for layout functionality
- **`:has()` Selector**: Required for adaptive columns
- **`clamp()`**: Required for responsive sizing

## Troubleshooting

### Common Issues

1. **Panels not stretching**: Ensure parent containers use `display: flex` and `flex-direction: column`
2. **Footer not full-width**: Verify footer is outside grid container
3. **Sidebar too wide**: Adjust `clamp()` values in media queries
4. **Content overflow**: Check `overflow` and `min-height` properties

### Debug Steps

1. Enable debug borders to visualize panel boundaries
2. Use browser dev tools to inspect grid structure
3. Verify responsive breakpoints with viewport resizing
4. Test with varying content lengths

## Future Enhancements

- Collapsible sidebar functionality
- Sticky header/footer options
- Animation transitions for responsive changes
- Custom breakpoint configurations
- Panel resize handles for user customization
