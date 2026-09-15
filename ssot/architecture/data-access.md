# Architecture - Data Access

## Purpose

Data access libraries isolate feature reads, resources, API calls, and request/result mapping from page components.

## Pattern

```text
Page component
|
Container
|
Integration service
|
Data-access service
|
Store, API service, Firebase, or backend callable
```

## Responsibilities

- Load feature data.
- Own Angular `resource` loaders and params.
- Expose signals/resources to integration services.
- Delegate shared Firebase operations to `libs/bite-tribe/api`.
- Keep feature-local types near the feature.

## Settings Write Rule

`SettingsApiService.saveSettings` writes the settings document with `setDocument` and no merge, so it **replaces** the document. Every caller must send a complete `Settings` object built on top of the currently stored one; a partial write silently drops the keys it omits.

The settings page reloads the document (`document.location.reload()`) to apply a language change. Surfaces that cannot survive a reload — the onboarding assistant, which would lose its in-progress flow — must call `TranslocoService.setActiveLang` directly instead and persist the `lang` preference themselves (epic \#850, issue \#1015).

## Offline Write Rule

A Firestore write applies to the local cache immediately but its promise only settles once the server acknowledges it. Offline the two come apart: listeners and the UI see the new value at once, while the `await` stays open for as long as the device is disconnected.

Never `await` a Firestore write on a path that has to keep working offline. Start the write, carry on with the local state, and let it settle on its own; the write is queued and applied in order either way. Awaiting one is what stopped a retried photo upload from ever starting — and with it the stall watchdog that would have failed it — while the same code path online looked correct (issue \#1390, [[issue-1390]]).

Awaiting is still right where the acknowledgement is the point: a flow that must not continue until the data is durable, or one that needs the write's own error.

## Code Anchors

```text
libs/bite-tribe/*/data-access
libs/bite-tribe-business/*/data-access
libs/bite-tribe/api
libs/bite-tribe/store
libs/bite-tribe/api/src/lib/settings-api/settings-api.service.ts
```

## Current Limitations

- Some feature flows still mix store-derived state and resource-derived state.
- Shared API services should stay the choke point for repeated Firestore operations.
- Backend-owned query semantics should move to Firebase Functions when needed for trust, performance, or security.
