# Architecture

## Feature Boundaries

Prefer existing Nx library boundaries:

- `libs/**/page`: presentation and integration. Component files own template/state rendering; `integration/*.container.ts` wires components to services; `integration/*.service.ts` owns UI workflow and navigation.
- `libs/**/data-access`: resource signals, callable/API wrappers, Firestore/API access, and typed request/result shapes used by the feature.
- `libs/bite-tribe-common/model`: shared app models only when multiple libraries need the same domain type. For feature-local result shapes, prefer colocated exported types in the feature data-access library.
- `libs/bite-tribe/store`: NgRx state, router selectors, derived selectors, effects, and app-wide transformations.
- `libs/bite-tribe/api`: client-side Firebase/Firestore API services and storage helpers used by app features.
- `apps/bite-tribe-firebase/functions`: backend callable/storage/pubsub functions. Export new functions from `src/index.ts`.
- `apps/bite-tribe/src/assets/i18n/*.json`: BiteTribe translations. If visible UI text is added, add keys for every app locale, not only English.

## Common Flow

1. Read the current feature's component, container, service, data-access service, tests, and related Firebase/API function before editing.
2. Keep UI-only display logic in the page component unless it drives navigation or persistence.
3. Keep navigation and workflow decisions in the integration service.
4. Keep remote calls and resource params in data-access. Add typed request/result interfaces there when the shape is feature-local.
5. Keep backend filtering/mapping in Firebase functions when a callable owns query semantics.

## Implementation Patterns

- Angular/Ionic pages generally use standalone components, signals, `input()`, `output()`, `computed()`, and HTML control flow (`@if`, `@for`).
- Containers should stay thin: pass service signals/resource values into the page and route page outputs back to service methods.
- For result lists, prefer discriminated unions over guessing from object shape.
- For images, follow `imagePath || image || ''`. `imagePath` often contains the usable Firebase Storage download URL.
- For Ionic icons, check `libs/common/utils/src/lib/add-necessary-icons.ts`; register new icon names there if they are not already included.
- Prefer Ionic layout helper classes such as `ion-display-flex`, `ion-flex-column`, `ion-flex-row`, and `ion-justify-content-*` for simple flex layout before adding component CSS.
- For dialogs/labels/buttons, use Transloco keys. Avoid hardcoded visible English in templates or alert config.
- For route assembly, reuse `PATH` from `libs/common/utils/src/lib/paths.ts` where possible.
- Avoid broad refactors while implementing an issue. Touch the layer that owns the behavior and adjacent tests.
