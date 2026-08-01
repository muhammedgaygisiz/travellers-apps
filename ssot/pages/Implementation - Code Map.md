# Implementation - Code Map

## Purpose

The code map helps contributors find the right implementation surface quickly.

## Apps

| Path                                 | Purpose                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------- |
| `apps/bite-tribe`                    | Consumer BiteTribe app shell, assets, app configuration, and locale files |
| `apps/bite-tribe-business`           | Business-facing app shell and assets                                      |
| `apps/bite-tribe-firebase/functions` | Firebase backend functions, callable APIs, triggers, and scheduled jobs   |
| `apps/bite-tribe-ios`                | Capacitor iOS wrapper                                                     |
| `apps/bite-tribe-android`            | Capacitor Android wrapper                                                 |
| `apps/storybook-host`                | Storybook host for shared and feature UI states                           |
| `apps/bite-tribe-e2e`                | Consumer app Playwright end-to-end tests                                  |
| `apps/bite-tribe-business-e2e`       | Business app Playwright end-to-end tests                                  |

## Consumer Feature Libraries

```text
libs/bite-tribe/<feature>/page
libs/bite-tribe/<feature>/data-access
```

Examples:

- `libs/bite-tribe/bite/page`
- `libs/bite-tribe/bite/data-access`
- `libs/bite-tribe/search/page`
- `libs/bite-tribe/search/data-access`
- `libs/bite-tribe/profile/page`
- `libs/bite-tribe/profile/data-access`

## Business Feature Libraries

```text
libs/bite-tribe-business/<feature>/page
libs/bite-tribe-business/<feature>/data-access
```

Examples:

- `libs/bite-tribe-business/restaurant/page`
- `libs/bite-tribe-business/restaurant/data-access`
- `libs/bite-tribe-business/create-bite-trail/page`
- `libs/bite-tribe-business/create-bite-trail/data-access`
- `libs/bite-tribe-business/dashboard/page`
- `libs/bite-tribe-business/dashboard/data-access`

## Shared Libraries

| Path                                | Purpose                                                          |
| ----------------------------------- | ---------------------------------------------------------------- |
| `libs/bite-tribe/api`               | Shared client-side Firebase, Firestore, Storage, and API helpers |
| `libs/bite-tribe/store`             | App-wide NgRx state, effects, selectors, and router state        |
| `libs/bite-tribe-common/model`      | Shared domain model types used across multiple libraries         |
| `libs/bite-tribe-common/bite`       | Shared Bite UI/domain support                                    |
| `libs/bite-tribe-common/bite-trail` | Shared BiteTrail UI/domain support                               |
| `libs/bite-tribe-common/map`        | Shared map functionality                                         |
| `libs/common/ui`                    | Shared reusable UI components                                    |
| `libs/common/utils`                 | Shared utilities, paths, icon registration, and helpers          |
| `libs/common/ta-firestore`          | Firebase bootstrap and Firestore integration support             |
| `libs/common/geolocation`           | Shared geolocation support                                       |
| `libs/common/push-notifications`    | Push notification support                                        |

## Backend Functions

```text
apps/bite-tribe-firebase/functions/src/functions
apps/bite-tribe-firebase/functions/src/index.ts
```

Function files are named after the behavior they expose, such as `search-bites.ts`, `load-leaderboard.ts`, and `set-bite-image-path-on-upload.ts`.

## Related Pages

- [[Implementation - Libraries]]
- [[Implementation - Feature Patterns]]
- [[Implementation - Firebase Functions]]
