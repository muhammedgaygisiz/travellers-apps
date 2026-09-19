# Implementation - Libraries

## Purpose

Libraries are the main unit of implementation ownership in BiteTribe.

Each library should have a clear reason to exist and should keep dependencies flowing toward stable shared surfaces, not sideways through feature internals.

## Library Types

| Library Type  | Responsibility                                                                                      |
| ------------- | --------------------------------------------------------------------------------------------------- |
| `page`        | Presentation components, containers, integration services, page tests                               |
| `data-access` | Feature reads, Angular resources, callable wrappers, feature-local DTOs                             |
| `api`         | Shared Firebase/Firestore/Storage services used by multiple features                                |
| `store`       | App-wide NgRx state, effects, selectors, and router-derived state                                   |
| `model`       | Shared domain types used by multiple apps or features                                               |
| `common/ui`   | Reusable visual components and Storybook-backed UI states                                           |
| `common/*`    | Shared technical capabilities such as geolocation, utilities, network state, and Firebase bootstrap |

## Consumer App Libraries

Consumer functionality lives under `libs/bite-tribe`.

Most feature areas use this shape:

```text
libs/bite-tribe/<feature>/page
libs/bite-tribe/<feature>/data-access
```

**A `type:feature` library may not import another `type:feature` library.** The
`depConstraints` in `eslint.config.mjs` allow a feature to reach `type:ui`,
`type:data-access`, `type:model`, `type:store` and `scope:common`, and nothing
else. A component two features both need therefore belongs in a `type:ui`
library - or, where extracting one is out of proportion to the change, both
screens live in the one feature library that already owns the component.

Issue [#1103] is the worked example. The table ordering screen renders `bt-menu`,
which lives in `libs/bite-tribe/menu/page` beside the public menu of issue
[#1102], so the screen was written there rather than in
`libs/bite-tribe/table-session`. The alternative - a second copy of the menu
renderer - is how two menus start disagreeing about what an unavailable dish
looks like. Its cart and its submission are a `type:data-access` library of their
own, `bite-tribe/table-order-data-access`, which both the ordering screen and
anything later can reach.

Issue [#370] is the counter-example, and it moved a library rather than placing a
screen. The QR encoder and its SVG renderer had grown inside
`libs/bite-tribe-business/floor-plan/ui`, because table codes were the only codes
BiteTribe printed. A restaurant publishing its menu prints one too, and must not
reach into the floor-plan library to do it - so the encoder and `bt-qr-code` are
`libs/common/ui/qr-code`, and the floor-plan library kept only what is about
tables: the scan URL and the alphanumeric split of its token, behind a thin
wrapper its call sites still use. A `type:ui` library under `scope:common` is what
both apps can reach; the alternative was a second encoder, which is `RD-PM-2`.

## Business App Libraries

Business functionality lives under `libs/bite-tribe-business`.

Business features follow the same page/data-access split where the feature has both UI workflow and remote data behavior.

## Shared Domain Libraries

Shared BiteTribe domain concepts live under `libs/bite-tribe-common`.

Use `libs/bite-tribe-common/model` only when multiple features need the same type. Keep one-off feature response shapes inside the feature data-access library.

## Adding A Library

- Prefer Nx generators so `project.json`, tags, path mappings, Jest config, and TypeScript config are created consistently.
- Compare with the nearest sibling library before hand-writing config.
- Keep import boundaries aligned with the owning domain.
- Add tests and Storybook coverage when the library introduces visible reusable UI behavior.

## Related Pages

- [Architecture - Nx Workspace](../architecture/nx-workspace.md)
- [Implementation - Code Map](code-map.md)
- [Implementation - Naming Conventions](naming-conventions.md)

[#1102]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1102
[#1103]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1103
[#370]: https://github.com/muhammedgaygisiz/travellers-apps/issues/370
