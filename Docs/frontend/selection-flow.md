# Navigation → Viewer Selection Flow

This document explains how `src/components/layout/functional/navigation_sidebar.astro` selects an MCard item and how it informs `src/components/layout/functional/dynamic-content-viewer.astro` to render the selected content.

Both components communicate via a global Redux store exposed as `window.reduxStore`.

## Components involved

- __Navigation sidebar__: `src/components/layout/functional/navigation_sidebar.astro`
- __Content viewer__: `src/components/layout/functional/dynamic-content-viewer.astro`
- __Shared utils__: `src/utils/content-type-utils.ts`

## How selection works in the navigation sidebar

- __Item buttons__: Built in `renderPage()` with button data attributes: `data-hash`, `data-title`, `data-content-type`, `data-g-time`.
  - Code: `renderPage()` generates `<button class="nav-link" ...>` entries with attributes.
- __Click handler__: `setupSelectionHandlers()` attaches listeners to `.nav-link`.
  - Reads attributes from the clicked button.
  - Applies highlight classes for visual feedback.
  - __Dispatches Redux action__:
    ```js
    window.reduxStore.dispatch({
      type: 'mcardSelection/setSelectedMCard',
      payload: { hash, title, gTime, contentType }
    })
    ```
- __Data loading__: `loadMCardData()` and `performSearch()` fetch from the MCard API and normalize titles/types using `content-type-utils` so the sidebar and viewer stay consistent.
- __Runtime env__: MCard API base URL is sourced from `window.RUNTIME_ENV.PUBLIC_MCARD_API_URL` with a short-lived updater that reloads data when the URL changes.

## How the content viewer reacts

- __Redux subscription__: In `setupReduxSubscription()` the viewer subscribes to `window.reduxStore`.
  - On state change, it reads `state.mcardSelection.hash` and `title`.
  - If the `hash` differs from the last loaded hash, it calls `window.loadMCardContent(hash, title)`.
- __Loading pipeline__: `window.loadMCardContent(hash, title)`
  - Gets API base URL (same runtime mechanism).
  - Fetches metadata: `GET /card/{hash}/metadata`.
  - Resolves effective content type and computes a unified display title using `content-type-utils`.
  - Chooses a renderer based on content type and fetches content accordingly:
    - Text-like types: `GET /card/{hash}/content?as_text=true`
    - Binary types (image/pdf/etc.): direct URL used by renderer
  - Renders via `renderContentWithComponent()` and initializes renderer-specific logic (Markdown/HTML/JSON/Text/Image/PDF).

## Data contract between sidebar and viewer

Redux action payload used by the sidebar:
```ts
{
  hash: string,
  title?: string,
  gTime?: string,
  contentType?: string
}
```
The viewer only needs `hash` to load; `title` enhances the header display.

## Resilience and readiness

- __Store readiness__: Both components retry up to 10 times (1s interval) if `window.reduxStore` is not yet available.
- __Runtime env updates__: Both check for changes to `window.RUNTIME_ENV.PUBLIC_MCARD_API_URL` during the first ~10 seconds and react accordingly.

## Sequence diagram

```mermaid
sequenceDiagram
  actor U as User
  participant NS as navigation_sidebar.astro
  participant RS as window.reduxStore
  participant CV as dynamic-content-viewer.astro
  participant API as MCard API

  U->>NS: Click list item (button.nav-link)
  NS->>NS: Read data-* attrs (hash, title, contentType, gTime)
  NS->>RS: dispatch("mcardSelection/setSelectedMCard", payload)
  RS-->>CV: state change notification (subscribe)
  CV->>CV: Detect new mcardSelection.hash
  CV->>CV: loadMCardContent(hash, title)
  CV->>API: GET /card/{hash}/metadata
  API-->>CV: metadata (content_type, filename, g_time, title)
  CV->>CV: resolve effective content type + display title
  alt Text-like content
    CV->>API: GET /card/{hash}/content?as_text=true
    API-->>CV: content (text)
    CV->>CV: renderContentWithComponent("markdown|html|json|text")
  else Binary content
    CV->>CV: renderContentWithComponent("image|pdf|unknown")
  end
  CV-->>U: Content displayed in viewer
```

## Key references (code locations)

- __Sidebar item render__: `navigation_sidebar.astro` → `renderPage()`
- __Sidebar click→dispatch__: `navigation_sidebar.astro` → `setupSelectionHandlers()`
- __Viewer subscribe__: `dynamic-content-viewer.astro` → `setupReduxSubscription()`
- __Viewer load__: `dynamic-content-viewer.astro` → `window.loadMCardContent()`
- __Renderer init__: `dynamic-content-viewer.astro` → `renderContentWithComponent()` and `initialize*Renderer()` functions
- __Shared utilities__: `src/utils/content-type-utils.ts`

## Notes

- The API base URL should be provided at runtime via `PUBLIC_MCARD_API_URL` (client-safe), per environment variable rules.
- All card content and metadata are retrieved from the MCard API, per MCard data access rules.
