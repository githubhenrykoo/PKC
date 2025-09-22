# Agents

## Purpose

This document defines the agent architecture for PKC. Agents are small, composable, event-driven workers that coordinate user interactions and background tasks across the three planes of the MVP Card system:
- Control Plane (process orchestration) via [PCard.md](./PCard.md)
- Data Plane (content addressing and storage) via [MCard.md](./MCard.md)
- Value Plane (security boundaries and exchange) via [VCard.md](./VCard.md)

Agents speak on the PocketFlow bus (`src/pocketflow/bus.ts`) using canonical topics from `src/pocketflow/events.ts`. They follow the Flux-to-Flow guidance in [flux2flow_state-management.md](./flux2flow_state-management.md) and complement the practices described in [Redux-State-Management.md](./Redux-State-Management.md).

---

## Design Principles

- **Event-first orchestration**: Coordination happens through PocketFlow topics. Agents subscribe, react, and may emit new events.
- **Token-conservation semantics**: Effects must be conservative and idempotent, consistent with Place–Transition nets in [PCard.md](./PCard.md).
- **Hash-first discipline**: Persistent references are MCard hashes; content is retrieved through the MCard API (see [.windsurf/rules/mcard-rules.md](/.windsurf/rules/mcard-rules.md)).
- **Separation of concerns**: Control (agents), Data (MCard), Value (VCard); avoid ad-hoc coupling.
- **Least privilege**: Each agent has a narrow responsibility and minimal access.
- **Runtime configurability**: Follow environment rules ([environment-variables.md](/.windsurf/rules/environment-variables.md)); only `PUBLIC_*` visible to client.
- **Deployable anywhere**: Align with Docker rules ([Docker-rules.md](/.windsurf/rules/Docker-rules.md)) and Astro/Islands architecture.

---

## Agent Taxonomy

Agents are grouped by intent and the plane they primarily serve. Each agent describes: responsibilities, primary topics, consumed/produced events, invariants, and observability signals.

### 1) Runtime Agent (Control Plane)
- **Responsibility**: Bootstrap runtime, load environment, announce readiness, coordinate feature flags.
- **Consumes**: browser lifecycle hooks, container env.
- **Produces**: `pocketflow/runtime/envLoaded` (see existing `PF_RUNTIME_ENV_LOADED`).
- **Invariants**: Emitted once per session. Idempotent.
- **Observability**: Startup timing, env keys present (redacted).

### 2) Authentication Agent (Value Plane)
- **Responsibility**: Coordinate login/logout/refresh flows; maintain session integrity; emit auth state changes.
- **Consumes**: UI intents (login, logout), token refresh timers.
- **Produces**: `pocketflow/auth/loggedIn`, `pocketflow/auth/loggedOut`, `pocketflow/auth/tokenRefreshed`.
- **Invariants**: Never emit raw secrets in payloads. Payloads are opaque IDs and expiry metadata.
- **State**: Hydrates Redux auth slice (see [Redux-State-Management.md](./Redux-State-Management.md)).
- **Security**: Follow VCard security guidance and local security containers. Avoid exposing non-PUBLIC env vars.

### 3) Theme Agent (Control/UI)
- **Responsibility**: Manage theme changes (system, user preference), propagate to panels.
- **Consumes**: system theme, user preferences.
- **Produces**: `pocketflow/ui/themeChanged`.
- **Invariants**: Idempotent; no persistence unless explicitly chosen.
- **State**: Updates theme context or a small UI slice (`src/context/ThemeContext.tsx`).

### 4) MCard Selection Agent (Data Plane)
- **Responsibility**: Manage selection tokens across panels/places; ensure selection consistency.
- **Consumes**: `pocketflow/mcard/selected`, user navigation.
- **Produces**: `pocketflow/mcard/selectionChanged` (existing), optional `pocketflow/mcard/loaded`.
- **Invariants**: Payloads are MCard hashes; one authoritative selection token per place.
- **State**: Panel-scoped stores for `sidebar`, `content`, `right` places (see `src/layouts/AppShell.astro`).

### 5) Data Access Agent (Data Plane)
- **Responsibility**: Resolve MCard hashes to content via API; cache and deduplicate.
- **Consumes**: selection and load requests.
- **Produces**: `pocketflow/data/loaded`, `pocketflow/data/error`.
- **Invariants**: No direct filesystem writes; API-only per mcard rules.
- **State**: Data caches keyed by hash; TTL/eviction policy documented.

### 6) RAG/Indexing Agent (Optional, Data Plane)
- **Responsibility**: Coordinate indexing and semantic retrieval when Local RAG is enabled (see [Docs/RAG_user-manual.md](./RAG_user-manual.md)).
- **Consumes**: `pocketflow/index/request`.
- **Produces**: `pocketflow/index/completed`, `pocketflow/index/error`.
- **Invariants**: Record counts and processing time; do not emit raw document contents in events.

### 7) Networking Agent (Optional, Control/Data)
- **Responsibility**: Manage P2P readiness (libP2P/IPFS/DHT) when enabled; surface connectivity state.
- **Consumes**: network changes, peer discovery.
- **Produces**: `pocketflow/net/ready`, `pocketflow/net/peerChanged`.
- **Invariants**: Do not leak peer identifiers beyond policy.

### 8) DevTools Agent (Cross-cutting)
- **Responsibility**: Provide development-time visibility into events and state; bridge to Redux DevTools.
- **Consumes**: All bus topics (dev mode tap).
- **Produces**: `pocketflow/dev/logged`, `pocketflow/dev/replayed`.
- **Invariants**: Redact payloads; support event replay for idempotent flows only.

---

## Event Contracts

For each topic, define and maintain a contract alongside its declaration in `src/pocketflow/events.ts`:
- **Topic**: namespaced string (`pocketflow/auth/loggedIn`).
- **Payload Schema**: fields and types; prefer `{ hash, meta? }` for data.
- **Places Affected**: which panel/store is updated.
- **Conservation Rule**: what tokens are created/consumed; duplication avoidance.
- **Replay Policy**: idempotency notes and prerequisites.

Summarize these contracts in feature docs and cross-link back here.

---

## State Integration (flux2flow)

- **Redux**: Keep where it excels—authentication, derived selectors, persistence, Redux DevTools. See [Redux-State-Management.md](./Redux-State-Management.md).
- **PocketFlow**: Primary bus for coordination; agents subscribe/publish. See [flux2flow_state-management.md](./flux2flow_state-management.md).
- **Panels as Places**: Align stores to UI places (e.g., `sidebar`, `content`, `right`) in `src/layouts/AppShell.astro` and `src/layouts/MainLayout.astro`.

Guideline pattern (notation):
```
[pocketflow topic] -> [agent listener] -> [panel store write] -> [selector] -> [component]
```

---

## Lifecycle

1. **Bootstrap**: Runtime Agent emits `envLoaded`.
2. **Auth**: Authentication Agent restores session (if any) and emits `loggedIn`/`loggedOut`.
3. **Theme**: Theme Agent emits `themeChanged` based on system or preference.
4. **Selection**: MCard Selection Agent coordinates initial selection tokens.
5. **Data**: Data Access Agent resolves hashes and fills caches.
6. **Optional**: RAG/Indexing and Networking Agents announce readiness and respond to requests.

Each step is event-driven and idempotent to support replay.

---

## Observability & Dev Experience

- **Redux DevTools**: Enabled for Redux-managed slices (auth, panel stores if Redux-based).
- **PocketFlow Inspector (dev)**: Tap the bus to show recent events, timings, and listener results (redacted payload summaries).
- **Replay**: Allow republishing selected events in dev for flows marked idempotent.
- **Logging**: Structured logs with topic, latency, status.

---

## Security & Privacy

- **No sensitive payloads**: Never place tokens/PII in events or client-visible state.
- **Opaque identifiers**: Prefer hashes and IDs; resolve via server/API.
- **Environment hygiene**: Only `PUBLIC_*` reachable on client per [environment-variables.md](/.windsurf/rules/environment-variables.md).
- **VCard alignment**: Follow security container principles in [VCard.md](./VCard.md) and related docs.

---

## Deployment Notes

- **Docker/Compose**: Follow [.windsurf/rules/Docker-rules.md](/.windsurf/rules/Docker-rules.md). No special agent containers; agents are client/runtime components.
- **Astro Islands**: Agents may initialize within islands; prefer minimal JS and defer non-critical subscriptions.
- **PWA**: Ensure agent initialization respects PWA lifecycle (foreground/background) and is robust to offline/online transitions.

---

## Roadmap

- **Event Catalog Completion**: Finalize topic list and contracts in `src/pocketflow/events.ts` for auth, ui, data, devtools.
- **flux2flow Bridge**: Add `src/pocketflow/flux2flow.ts` for ergonomic publish/subscribe and contract checks.
- **Inspector**: Implement a dev-only PocketFlow inspector.
- **Conservation Checks**: Add development-time assertions for token conservation and idempotence.
- **Docs**: Update feature docs to enumerate their agent(s), topics, and invariants.

---

## References

- [PCard.md](./PCard.md)
- [MCard.md](./MCard.md)
- [VCard.md](./VCard.md)
- [Redux-State-Management.md](./Redux-State-Management.md)
- [flux2flow_state-management.md](./flux2flow_state-management.md)
- [.windsurf/rules/mcard-rules.md](/.windsurf/rules/mcard-rules.md)
- [.windsurf/rules/environment-variables.md](/.windsurf/rules/environment-variables.md)
- [.windsurf/rules/Docker-rules.md](/.windsurf/rules/Docker-rules.md)
- [.windsurf/rules/shadcn.md](/.windsurf/rules/shadcn.md)
