# Pocketflow Alignment Plan

This document outlines how we will align the SPA to a Pocketflow-style protocol-first architecture while preserving current functionality.

## Goals

- Single source of truth for state (Redux Toolkit)
- Protocol-first event bus (Pocketflow bus) for decoupled flows
- Bridge between bus and Redux for deterministic synchronization
- Runtime env propagation via protocol events

## Steps

1) Remove duplicate/simple store and ensure a single Redux Toolkit store is initialized once at app start.
2) Introduce a Pocketflow bus and a Redux bridge; wire it in the root layout so components can keep using Redux or bus seamlessly.
3) Publish runtime env readiness as a Pocketflow event and remove ad-hoc polling for API URL.
4) Migrate component interactions to publish/subscribe with the bus (keeping Redux dispatch during transition).
5) Add developer logger/replayer for Pocketflow events and Redux transitions.

## Deliverables in this iteration

- Single Redux store bootstrap at app startup
- `pocketflow/bus.ts`, `pocketflow/bridge-redux.ts`, `pocketflow/events.ts`, `pocketflow/bridge-init.ts`
- `MainLayout.astro` updated to load store boot and bridge init via module scripts

See source files:
- `src/store/store.ts`
- `src/pocketflow/bus.ts`
- `src/pocketflow/bridge-redux.ts`
- `src/pocketflow/events.ts`
- `src/pocketflow/bridge-init.ts`
