# Architecture - State Management

## Purpose

State management coordinates app-wide data, derived state, routing params, filters, sorting, and side effects.

## Main Pattern

```text
Actions
|
Effects
|
API or data-access calls
|
Reducers
|
Selectors
|
Signals or containers
```

## Store Responsibilities

- Auth-linked app state.
- Bites.
- Bucket lists.
- Likes.
- Menus.
- Reviews.
- Filtering and sorting.
- Router params.
- Derived selectors for feature views.

## Code Anchors

```text
libs/bite-tribe/store/src/lib/provide-bite-tribe-store.ts
libs/bite-tribe/store/src/lib/bites
libs/bite-tribe/store/src/lib/bucketlists
libs/bite-tribe/store/src/lib/filtering-and-sorting
libs/bite-tribe/store/src/lib/router
libs/bite-tribe/store/src/lib/app
```

## Current Limitations

- Some newer feature data uses Angular resources directly, while older/shared flows use NgRx.
- Store and resource boundaries should remain explicit so features do not duplicate remote state ownership.
