# Implementation - Code Map

## Purpose

The code map helps contributors find the right implementation surface quickly.

## Apps

| Path                                 | Purpose                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------- |
| `apps/bite-tribe`                    | Consumer BiteTribe app shell, assets, app configuration, and locale files |
| `apps/bite-tribe-business`           | Business-facing app shell and assets                                      |
| `apps/bite-tribe-admin`              | Internal operations app shell and assets                                  |
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
- `libs/bite-tribe-business/staff/page`
- `libs/bite-tribe-business/staff/data-access`
- `libs/bite-tribe-business/floor-plan/page`
- `libs/bite-tribe-business/floor-plan/data-access`
- `libs/bite-tribe-business/floor-plan/ui`

`floor-plan` is the one feature with a third library. It was also the one that
existed as half a pair for a while: issue \#1081 added the data-access half so
persistence, rules and conflict handling could be settled and tested before an
editor existed, and issue \#1082 added the `page` half with the editor.

The third library, `floor-plan/ui`, holds the canvas. It is a `type:ui` library
in the `scope:bite-tribe-business` scope - the shape `libs/bite-tribe/coach-mark`
already uses in the consumer scope - rather than another component inside the
page library, because `@nx/enforce-module-boundaries` forbids `type:ui` from
importing `type:data-access`. That makes the canvas structurally unable to read
or write a room: it takes a `Room` and the items standing in it, draws them, and
reports back the geometry a gesture produced. Issue \#1083 added the palette and
the edit geometry beside it - pure functions over millimetres for snapping,
clamping, resizing and rotation - while the layout being edited, its undo history
and every write stayed in `page`. See [[Floor Plan]].

Issue \#1087 put the printed QR code in the same library, for the same reason:
`table-qr-code.ts` turns a token into an SVG path and knows nothing about where
the token came from, and `TableQrCodeComponent` draws it. The sheet that decides
which tables to print, asks the backend for their tokens and carries the print
stylesheet is in `page`, and its route is
`restaurant/:restaurantId/floor-plan/qr-codes`.

The business app holds only what a restaurant does to its own data. Migrations,
restaurant-candidate verification, the unmatched Bite places and the
new-restaurant form they open left for the admin app with issue \#1473.

## Admin Feature Libraries

```text
libs/bite-tribe-admin/<feature>/page
libs/bite-tribe-admin/<feature>/data-access
```

A feature with a read surface uses the same `page` / `data-access` pair the
other two apps do. `shell`, `start` and `dashboard` stay flat because they have
no reads of their own; the pair is added per feature when one does, not
pre-emptively.

Examples:

- `libs/bite-tribe-admin/shell`
- `libs/bite-tribe-admin/start`
- `libs/bite-tribe-admin/dashboard`
- `libs/bite-tribe-admin/user-management/page`
- `libs/bite-tribe-admin/user-management/data-access`
- `libs/bite-tribe-admin/migrations/page`
- `libs/bite-tribe-admin/migrations/data-access`
- `libs/bite-tribe-admin/restaurants/page`
- `libs/bite-tribe-admin/restaurants/data-access`
- `libs/bite-tribe-admin/bites/page`
- `libs/bite-tribe-admin/bites/data-access`

`migrations/page` holds one page per migration rather than one page listing all
of them, because each is its own entry on the admin dashboard (issue \#1473).

## Shared Libraries

| Path                                   | Purpose                                                                                                    |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `libs/bite-tribe/api`                  | Shared client-side Firebase, Firestore, Storage, and API helpers                                           |
| `libs/bite-tribe/restaurant`           | Restaurant **view** for the consumer app; editing is business-only                                         |
| `libs/bite-tribe/store`                | App-wide NgRx state, effects, selectors, and router state                                                  |
| `libs/bite-tribe-common/model`         | Shared domain model types used across multiple libraries                                                   |
| `libs/bite-tribe-common/bite`          | Shared Bite UI/domain support                                                                              |
| `libs/bite-tribe-common/bite-trail`    | Shared BiteTrail UI/domain support                                                                         |
| `libs/bite-tribe-common/map`           | Shared map functionality                                                                                   |
| `libs/bite-tribe-common/opening-hours` | Weekly opening-hours editor, shared by the business edit-restaurant page and the admin new-restaurant form |
| `libs/common/ui`                       | Shared reusable UI components                                                                              |
| `libs/common/utils`                    | Shared utilities, paths, icon registration, and helpers                                                    |
| `libs/common/toast`                    | `ToastService`, the only way either app raises a toast                                                     |
| `libs/common/ta-firestore`             | Firebase bootstrap and Firestore integration support                                                       |
| `libs/common/geolocation`              | Shared geolocation support                                                                                 |
| `libs/common/push-notifications`       | Push notification support                                                                                  |

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
