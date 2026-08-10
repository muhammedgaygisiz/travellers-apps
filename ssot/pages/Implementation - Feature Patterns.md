# Implementation - Feature Patterns

## Purpose

Feature patterns describe the preferred shape for implementing user-facing behavior.

## Page Layer

Page libraries own visible behavior and route-level integration.

They commonly contain:

- Standalone Angular/Ionic components
- Template control flow with `@if` and `@for`
- `input()`, `output()`, and `computed()` signals
- Containers that bind route/service data to presentation components
- Integration services that handle navigation and workflow decisions

## Container Pattern

Containers should stay thin.

They should:

- Read route state or service signals
- Pass data into the component
- Route component outputs back into the integration service
- Avoid owning business rules directly

**A presentational component never consumes a service.** No data-access service, no injected handler token, no `ModalController`, no Capacitor plugin — not even indirectly through a provider the page component supplies. A `type:ui` component takes inputs and emits outputs; the container routes those outputs into the integration service, which owns the work. Two gate inputs make this workable for optional behavior: an `enable*` flag so a surface that does not handle an output shows no control for it, and the data itself as an input.

The Bite photo retry is the reference example: `bt-bite-image-status` takes `bite`, `userId`, and `enableRetry`, and emits `retryImageUpload`; the card and the details page pass it through; the containers hand it to `HomeService`, `ProfileService`, or `DetailsService`, which find the local copy, present the picker when it is gone, and call data-access. Presenting a modal is a workflow decision and belongs to those services, never to the component that raised the request.

## Service Pattern

Integration services should own workflow decisions such as:

- Navigation
- Modal and alert orchestration
- Save/delete/update flows
- Calling feature data-access services
- Coordinating user actions that touch multiple dependencies

## Data-Access Pattern

Data-access libraries should own:

- Feature-local Angular resources
- Firebase callable wrappers
- Firestore reads that are local to the feature
- Feature-local request and result types
- Mapping remote payloads into feature-ready shapes

### Reading A Resource

`ResourceRef.value()` throws a `ResourceValueError` once its resource is in an
error state, and `defaultValue` does not cover it — the value computed throws
before the default is consulted. Read from a template, that throw aborts the
whole binding update for the element: every input after it silently never runs,
so the surface freezes in whatever state it was in, usually a loading skeleton,
with nothing on screen to explain it. This is what left the Bite details page
loading forever in [issue #1232](https://github.com/muhammedgaygisiz/travellers-apps/issues/1232).

- A resource whose loader can reject is exposed through `resourceValue(...)`
  from `libs/common/utils`, never as `resource.value()`, and never straight off
  the resource in a template, a params function, or a computed.
- The failure is reported separately with `resourceFailed(...)`, so the surface
  gets a terminal state — an error card, a blocking alert — rather than a
  loading state that never ends. An unreadable list is not an empty one: saying
  "no followers yet" or "no Bites in this trail" states something untrue.
- A loader that catches everything itself can never enter the error state, and
  its value is safe to read directly. Say so in a comment where it is caught,
  so the exception is verifiable rather than looking like an oversight.
  `search`, `leaderboard` and the details-page position loader are the current
  examples.

## Shared API Pattern

Use `libs/bite-tribe/api` for shared Firebase, Firestore, and Storage operations that multiple features consume.

Do not duplicate shared Firebase access logic inside unrelated feature libraries.

## Signals And Reactive Forms

Effects that write to a reactive form need care. These have all caused real defects.

**Wrap form writes in `untracked()`.** An `effect` tracks every signal read while it runs, including signals read indirectly. `patchValue` runs the control's validators, so a validator that reads a signal makes the effect depend on it. The effect then re-runs whenever that signal changes, patches again, and loops — which can mean an endless stream of backend requests.

```ts
effect(() => {
  const profile = this.profile();
  untracked(() => this.form.patchValue({ ... }, { emitEvent: false }));
});
```

**Never let an async prefill overwrite user input.** Profile data resolves after the form renders, so a prefill effect can land while the user is already typing. Guard on `dirty`:

```ts
if (this.form.dirty) {
  return;
}
```

**Guard stale async results against the latest request, not against other state.** A "discard if the value changed" check that compares against a signal fed by a _different_ stream will discard fresh results whenever the streams land out of order, leaving the UI stuck in its pending state forever. Track the most recent request and only discard when a newer one has superseded it.

**Reflect external state into the form through a validator, not `setErrors`.** A manual `setErrors` is wiped the next time the control's value updates, because Angular re-runs validation and finds no validators. A validator re-derives the error on every value change instead. Trigger it with `updateValueAndValidity({ emitEvent: false })` when the external state changes. This is how Ionic's native invalid styling is driven; see [[Implementation - Ionic Patterns]].

## Header Loading Indication

`ta-page` accepts a `loading` flag that reports a background load without taking content off the screen:

```html
<ta-page [loading]="isReloading()"></ta-page>
```

It renders an indeterminate `ion-progress-bar` over the toolbar's 3px bottom separator, so turning it on never changes the header height or reflows the content below it.

One detail is easy to get wrong and made the bar invisible during development: `ion-toolbar` carries `z-index: 10` and its own box includes the separator, so the bar needs a higher `z-index` or the toolbar paints over it and only the plain separator shows. Colours are Ionic's defaults, which resolve to the app's primary on a theme-adaptive track.

**A page that shows a skeleton or a spinner runs the header bar at the same time.** The bar is bound to the same condition as the placeholder, so the two appear and disappear together and the header always says whether the page is busy:

| Page         | Placeholder            | Bound condition      |
| ------------ | ---------------------- | -------------------- |
| Home feed    | Bite skeleton list     | `showBiteSkeleton()` |
| Profile      | `profile-skeleton`     | `showSkeleton()`     |
| Bite details | Inline skeleton fields | `!bite()`            |
| Leaderboard  | Spinner                | `isLoading()`        |
| Gallery      | Spinner                | `loading()`          |
| Followers    | Spinner                | `isLoading()`        |
| Search       | Spinner                | `isLoading()`        |

This is deliberately additive: it does not change when a placeholder appears. Field-level indicators stay out of it — a deferred image placeholder, an upload spinner inside a form control, or a spinner inside a button report their own element, not the page.

The end state is that a reload of content already on screen reports itself only through this bar instead of replacing that content with a placeholder. Adopting it is the first half of that move. See GitHub issue #1168.

## Entry Feedback Contract

**An action whose result is a page change reports the wait on the control that was used.** A route is not free: a guard can be a network round-trip and the page itself is a lazy chunk, so the seconds between the tap and the new page are seconds the old page still owns. Leaving them unanswered reads as a dead button and invites a second tap.

The pattern is the sign-in one from [[Architecture - Auth]], applied to navigation:

- The pending flag lives in the integration service that owns the navigation, raised before the call and lowered in a `finally`, so a guard that redirects elsewhere or a failed navigation never leaves the control locked.
- The control locks behind a spinner and a pending label, and the page runs the header progress bar with it.
- The handler guards itself in code as well. The disabled control already blocks a second click, but a tap can be queued between the click and the flag turning on.

`ta-page` carries this for its add button through `addButtonPending`:

```html
<ta-page [addButtonPending]="createBitePending()" [loading]="createBitePending()"></ta-page>
```

Create Bite is the first case: `new-bite` is behind `freshSessionGuard`, which force-refreshes the ID token, plus the Bite page chunk. See GitHub issue #1287.

## List Windowing

**A list whose data arrives as one payload still renders in pages.** The callables and Firestore reads behind the feeds return the whole result set, so nothing is saved by paging the request — but rendering all of it mounts every row and starts every image request in one frame, which is what makes a large result set feel like a stall.

The window is client-side and always looks the same:

```ts
const PAGE_SIZE = 50;

displayedItems = computed(() => this.items().slice(0, this.currentPage() * PAGE_SIZE));
hasMore = computed(() => this.items().length > this.currentPage() * PAGE_SIZE);
```

`hasMore` gates an `ion-infinite-scroll`, whose `ionInfinite` handler raises the page and then calls `event.target.complete()`. The page counter resets to 1 whenever the underlying set changes — through the handler that changes it (home's search input) or through a `linkedSignal` on the source when the set arrives as an input (search results).

| Surface     | Windowed by                                 | Reset trigger        |
| ----------- | ------------------------------------------- | -------------------- |
| Home feed   | `home.component` over filtered Bites        | search input handler |
| Profile     | `profile.component` over Bites/Trails       | page load            |
| Search list | `search-list.component` over sorted results | new `results` input  |

List images carry `loading="lazy"` and `decoding="async"`, so rows below the fold cost nothing until they scroll in. The three are complementary and bound different resources: the window bounds the DOM, `loading` bounds the network, `decoding` keeps a batch of decodes from landing in one frame.

`decoding="async"` earns its place on the large images — the Bite card's 220px dish photo is the case it is for. On small avatars the decode is cheap enough that the browser's `auto` default behaves much the same; it is harmless there, not a win.

A view that needs the complete set reads the unwindowed signal — search's map plots every marker while its list pages.

## Image Pattern

For Bite images, prefer this display fallback:

```text
imagePath || image || ''
```

`imagePath` often contains the usable Firebase Storage download URL.

## Related Pages

- [[Architecture - Data Access]]
- [[Architecture - State Management]]
- [[Implementation - Code Map]]
