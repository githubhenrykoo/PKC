# Flux-to-Flow State Management (flux2flow)

## Purpose

This document proposes the Flux-to-Flow ("flux2flow") design for PKC, aligning traditional Redux/Flux ergonomics with the project’s event-first, token-conservation Control Plane as described in [PCard.md](./PCard.md). It builds on the latest guidance in [Redux-State-Management.md](./Redux-State-Management.md) and the existing PocketFlow bridge files (`src/pocketflow/bus.ts`, `src/pocketflow/events.ts`).

The goal is to keep Redux where it adds unique value (authentication, derived selectors, persistence, devtools) while moving interaction and coordination to PocketFlow events that embody PCard’s Place–Transition token flow semantics.

---

## Design Goals

- **Event-first control-plane**: PocketFlow events are the primary interaction mechanism; Redux reducers subscribe to events rather than drive them.
- **Hash-first payloads**: All persistent references are MCard hashes (see [Docs/MVP Cards for PKC.md](./MVP%20Cards%20for%20PKC.md) and [Docs/MCard.md](./MCard.md)); resolve content via the MCard API.
- **Panel/place scoping**: State is organized as token markings for UI “places”/panels defined in layouts (e.g., `sidebar`, `content`, `right` in `src/layouts/AppShell.astro`).
- **Conservation & idempotence**: Event listeners are conservative (no silent token loss/duplication) and idempotent to support replay and reasoning.
- **Incremental migration**: Preserve Redux developer experience while progressively shifting to event-first flow.
- **Observability & reproducibility**: Support Redux DevTools and event logs for time-travel-like debugging under Petri-style constraints made explicit in [PCard.md](./PCard.md).

---

## Conceptual Mapping (Redux → PocketFlow/PCard)

- **Action → Event**: Action types become PocketFlow topics; payloads remain minimal, hash-first descriptors.
- **Reducer → Store Writer**: Reducers/functions subscribe to events and write into small, focused stores (Redux slices or lightweight stores).
- **Middleware/Thunk → Listener/Effect**: Side-effects run in event listeners; they may emit further events (transition chaining).
- **State → Marking**: Treat state as token markings in places; transitions move tokens between places under conservation rules.
- **Selectors → Views**: Keep memoized selectors to compute derived views over panel-scoped stores.

Minimal illustrative example (notation only):
```
[pocketflow topic] -> [listener] -> [panel-scoped store write] -> [selector] -> [component]
```

---

## Architecture

- **PocketFlow Bus**: A tiny pub/sub (`pocketflow.publish/subscribe`) defined in `src/pocketflow/bus.ts`. It is the event backbone for UI and data flows.
- **flux2flow Bridge**: A small helper layer (proposed `src/pocketflow/flux2flow.ts`) that:
  - Namespaces topics (e.g., `pocketflow/auth/loggedIn`).
  - Wraps publish/subscribe with ergonomics suitable for UI, tests, and DevTools.
  - Documents event contracts (topic, payload schema, invariants).
- **Event Catalog**: Canonical topics in `src/pocketflow/events.ts` (runtime, selection, auth, UI theme, devtools hooks). Existing: `PF_RUNTIME_ENV_LOADED`, `PF_MCARD_SELECTED`, `PF_MCARD_SELECTION_CHANGED`.
- **Stores**:
  - Keep **Auth** in Redux for persistence, selectors, and effects (see [Redux-State-Management.md](./Redux-State-Management.md)).
  - Use **panel-scoped UI stores** (Redux slices or lightweight stores) hydrated from PocketFlow events.
  - Data caches keyed by **MCard hashes** per [MCard rules](./MCard.md) and [mcard-rules.md](/.windsurf/rules/mcard-rules.md).
- **Layouts as Places**: Panels in `src/layouts/AppShell.astro` and `src/layouts/MainLayout.astro` map to places in a PT net (per [PCard.md](./PCard.md)). Events move selection tokens among these places.

---

## Global State Catalogue & Design

1. **Authentication**
   - Primary store: Redux slice (tokens, session expiry, permissions).
   - Event contracts: `pocketflow/auth/loggedIn`, `pocketflow/auth/loggedOut`, `pocketflow/auth/tokenRefreshed`.
   - Side-effects: OIDC flows (see [Redux-State-Management.md](./Redux-State-Management.md)); listeners may emit post-login events (e.g., selection defaults).
   - Security alignment: Refer to [VCard.md](./VCard.md) and security containers in `MEMORY` (hardware-backed keys, JWT, WebAuthn). Keep credentials out of client PUBLIC vars (see [environment-variables.md](/.windsurf/rules/environment-variables.md)).

2. **Theme**
   - Store: small UI slice or local store hydrated by `pocketflow/ui/themeChanged`.
   - Persistence: optional (respect user/system preferences); integrate with `src/context/ThemeContext.tsx` if present.
   - Accessibility: ensure contrast and responsive rules per project style ([shadcn.md](/.windsurf/rules/shadcn.md)).

3. **Runtime Environment / Config**
   - Event: `pocketflow/runtime/envLoaded` (already defined).
   - Use only `PUBLIC_*` vars client-side; others remain server/container scope ([environment-variables.md](/.windsurf/rules/environment-variables.md)).

4. **MCard Selection**
   - Events: `pocketflow/mcard/selected`, `pocketflow/mcard/selectionChanged` (existing).
   - Store: panel-scoped selection per place (sidebar/content/right). Payloads carry MCard hashes; resolve content via MCard API per [mcard-rules.md](/.windsurf/rules/mcard-rules.md).

5. **Network/Connectivity**
   - Optional events for connectivity and P2P readiness (libP2P/IPFS/DHT) per project goals in README. Keep in sync with [PKC.md](./PKC.md) and networking notes.

6. **DevTools & Observability**
   - Keep Redux DevTools for Redux-managed slices.
   - Provide a **PocketFlow Event Log** (dev mode) to inspect topics, payloads (redacted), and listener outcomes.
   - Time-travel constraints: Petri-style flows are replayable when events are idempotent and hash-first. Document any non-replayable transitions (e.g., external API without recorded result).

---

## Event Contracts & Invariants

Each topic should document:
- **Topic**: namespaced string (e.g., `pocketflow/ui/themeChanged`).
- **Payload**: schema with hash-first references (e.g., `{ hash, meta? }`).
- **Places affected**: which panel/store is updated.
- **Conservation rule**: what is created/consumed; how duplication is avoided.
- **Replay policy**: is the event idempotent? can it be re-applied from logs?

These contracts live alongside the topic definition (e.g., in `src/pocketflow/events.ts` docblocks) and are summarized in this document.

---

## Migration Plan (Phased)

1. **Foundation**
   - Add `flux2flow` helper and extend `events.ts` with auth/ui/data topics.
   - Create a bootstrap (island or entry) to register subscriptions.

2. **Subscribe Redux slices to PocketFlow**
   - Auth slice listens for `pocketflow/auth/*` to hydrate/reset.
   - UI slices listen for selection and theme events; write to panel stores.
   - Data slices listen for selection changes to load/evict caches by hash.

3. **Adopt event-first components**
   - Replace direct Redux dispatches in cross-panel flows with PocketFlow publishes.
   - Keep Redux for auth and heavy selectors; verify persistence and DevTools continue to work.

4. **Conservation & Replay**
   - Add dev assertions for token conservation and idempotence.
   - Introduce a dev-only event log panel for inspection.

5. **Documentation & Examples**
   - Update feature docs to list their topics, payload schemas, and invariants.
   - Cross-link to [PCard.md](./PCard.md) sections on Place–Transition semantics and polynomial position.

---

## DevTools Strategy

- **Redux DevTools**: remain enabled for Redux slices (auth, panel stores if kept in Redux).
- **PocketFlow Inspector (dev)**: lightweight console/table showing recent topics, payload summaries (hashes only), listener success/failure, and elapsed times.
- **Replay**: allow re-publishing of selected events in dev to validate idempotence and verify conservation.

Document limitations upfront (e.g., events that depend on non-deterministic external services must capture resulting hashes or be marked non-replayable).

---

## Security & Privacy Considerations

- Do not emit sensitive tokens/PII in PocketFlow payloads; use hashes and opaque IDs.
- Align with VCard security container guidance in [VCard.md](./VCard.md) and related docs.
- Follow environment isolation rules in [environment-variables.md](/.windsurf/rules/environment-variables.md).

---

## Deployment & Runtime Notes

- The state system must remain deployable under the project’s Docker/Compose rules (see [Docker-rules.md](/.windsurf/rules/Docker-rules.md)).
- The same image should work across environments; runtime configuration comes from `.env` and `PUBLIC_*` variables as documented.

---

## Summary

Flux-to-Flow (flux2flow) preserves familiar Redux capabilities where they shine (authentication, selectors, persistence, DevTools) while adopting PocketFlow events and PCard’s token-conservation semantics for coordination.

- Event-first, hash-first, panel-scoped stores.
- Explicit contracts with conservation/replay guarantees.
- Incremental migration without losing developer ergonomics.

See also: [PCard.md](./PCard.md), [Redux-State-Management.md](./Redux-State-Management.md), [MCard.md](./MCard.md), [VCard.md](./VCard.md), and project rules in `.windsurf/rules/`.
