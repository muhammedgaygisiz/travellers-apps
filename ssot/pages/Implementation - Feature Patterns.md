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

Two details are easy to get wrong and both made the bar invisible during development:

- `ion-toolbar` carries `z-index: 10` and its own box includes the separator, so the bar needs a higher `z-index` or the toolbar paints over it.
- The separator is already `--ion-color-primary-shade`, so Ionic's default primary-on-primary bar disappears into it. The track keeps the separator colour and the moving segment uses `--bite-tribe-color`.

This exists so that pages which reload content they are already showing — a leaderboard or gallery reloaded on `ionViewDidEnter`, a pull-to-refresh on the home feed — can report the reload here instead of replacing the content with a spinner or skeleton. Those pages are being switched over one at a time; the flag is the shared piece. See GitHub issue #1168.

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
