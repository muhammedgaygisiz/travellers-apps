# Implementation - Ionic Patterns

## Purpose

Ionic theming and component behavior have repository-specific rules that are easy to get wrong and expensive to find. This page records the ones that have already caused defects.

## Theme Tokens

Theme tokens live in `apps/bite-tribe/src/theme/variables.scss`. The dark values come from a `dark-theme` mixin applied through `html.dark` and `@media (prefers-color-scheme: dark)`.

Use these adaptive tokens:

| Token                                             | Use for                  |
| ------------------------------------------------- | ------------------------ |
| `--ion-color-card-background`                     | Card and raised surfaces |
| `--ion-color-card-border`                         | Card borders             |
| `--ion-background-color`                          | Page background          |
| `--ion-text-color`                                | Primary text             |
| `--ion-color-medium`                              | Secondary text           |
| `--ion-color-primary` / `--ion-color-primary-rgb` | Accent, selection, focus |
| `--ion-color-danger` / `--ion-color-success`      | Error and success states |

`--ion-color-card-background` resolves through `--ion-color-tertiary-shade`, so it flips with the theme (`#d4d4d4` light, `#191e26` dark). Prefer it over hand-rolled surface colors.

## Tokens That Do Not Work Here

- **`--ion-color-light` is not a surface.** It is a fixed light value (`#f4f5f8`) that does **not** flip in dark mode. Using it as a background leaves theme-adaptive white text unreadable on it.
- **`--ion-color-step-*` and `--ion-item-background` are undefined.** The app imports Ionic's `core`, `normalize`, `structure`, and `typography` CSS but not the palette files that define stepped colors, and it never defines them itself. They resolve to empty, so `background: var(--ion-color-step-50)` silently becomes transparent and `border-color` falls back to `currentColor`.
- The theme does define `--ion-background-color-step-*` and `--ion-text-color-step-*`. Note the different names.

## Component Rules

- **`ion-input` with `fill="outline"` needs `mode="md"`.** The global Ionic mode is `ios` (`getIonicConfig()` in `libs/common/utils`), and the iOS mode renders an outlined input without a usable border. Every outlined input in the repository pairs the two.
- **Ionic validity styling requires `ng-invalid` _and_ `ng-touched`.** A control with no validators is always valid, so Ionic's `--highlight-color-invalid` never triggers. To drive the frame from state that lives outside the form, put that state behind a validator and mark the control touched. See [[Implementation - Feature Patterns]].
- **Do not style radio selection with `:has(:checked)`.** Chromium does not reliably invalidate `:has()` when a sibling radio steals the check through the group, which leaves a stale highlight on the deselected option. Drive selection from component state instead.
- **`ion-radio` can hide projected label content.** Its shadow label wrapper is collapsed with `label-text-wrapper-hidden` when it decides there is no label, which races with Angular content projection. For rich option cards, native radio inputs wrapped in a `<label>` are more predictable and keep the whole card tappable.
- **A solid `ion-button` inside a toolbar ignores `--background`.** Ionic derives the fill of an in-toolbar button from `--ion-toolbar-color` and its text from `--ion-toolbar-background`, so setting `--background` and `--color` has no visible effect. Set the toolbar pair instead; the footer bar and the desktop header button both do.
- **`ion-title` is absolutely positioned across the whole toolbar.** In `ios` mode it spans the full width and reserves a fixed 90px at each end for buttons, so anything wider than that in either slot will be overlapped by the centred title rather than pushing it aside. Give the title `position: static` when the toolbar carries more than an icon button.
- **A translated action label is what breaks that 90px reserve.** `Abbrechen` measures ~99px in the app's font, so the German header collides where the English one fits, and every locale has to be checked rather than only the one the copy was written in. Modal headers that pair a text action with a title use the `modal-header-title` mixin in `libs/bite-tribe-common/styles/_globals.scss`, which flows the title in the toolbar's row so the gap follows the real button width for any language. The app chrome header in `libs/common/ui/page` is deliberately excluded: its start slot is an icon-only back button that cannot collide, and flowing the title would push it off centre. See GitHub issue #1267.
- **An inline overlay inside a repeated row must be gated on its own open state.** `<ion-alert [isOpen]="…">` left in a template unconditionally is constructed for every instance of that template, presented or not. In a list this multiplies: the Bites feed carried one hidden `Delete Bite` alert per card — 50 of them against 51 cards, including Bites the signed-in user has no right to delete — and they stayed in the DOM after navigating away from the feed. Wrap the overlay in `@if (isOpen()) { … }` and bind `[isOpen]="true"` inside, so the element is created when the action is invoked and torn down on `didDismiss`. Ionic presents an overlay that is rendered with `isOpen` already true, so nothing else has to change. Gating on ownership instead is weaker: it still pays the cost on the user's own list. See GitHub issue #1327.
- **That open state has to identify the row, not just report that something is open.** A single component-level `isOpen` boolean read by every row in an `@for` opens **all** of the rows' overlays at once. They stack, the user only ever sees the topmost — the last row's — and each overlay carries its own row's `didDismiss` binding, so the action lands on the wrong record. In the Following list, clicking unfollow on the first account named and unfollowed the **last** one. Hold the pending record (`signal<PublicUser | undefined>`) instead of a boolean, and lift the single overlay out of the loop, bound to it: one alert per list rather than one per row, and the binding cannot drift from what was clicked. See GitHub issue #1334.
- **A `position: fixed` surface is not covered by the app chrome's safe area.** `ion-content` inherits the bottom inset through Ionic, so content inside a page clears the Android navigation bar and the iOS home indicator without anyone asking. A fixed overlay is positioned against the viewport instead, which on an edge-to-edge Android build extends behind the navigation bar, and it has to subtract `env(safe-area-inset-bottom)` itself. The Bitemap drawer is the case: it is translated to its snap position in pixels measured from `window.innerHeight`, so its last row landed exactly on the navigation bar. Keep the JavaScript offset free of the inset — publish it as a custom property and let the stylesheet subtract `env(safe-area-inset-bottom, 0px)` from it — so the snap arithmetic stays testable and the inset stays a rendering concern. The map's `my-position` floating button solves the same problem with the same `env()`. See GitHub issue #1392.
- **Alert button order is the rendered order, and the last button is the emphasised one.** `ion-alert` presents its buttons exactly as the array lists them; `role: 'cancel'` decides what `onDidDismiss` reports and the backdrop tap, never the position. Three or more buttons switch the group to `alert-button-group-vertical`, so the array order becomes top-to-bottom rows, and the photo-source sheet listing cancel first put it directly under the header where the first real choice is expected. Put cancel last in any sheet that offers a choice: the global `ios` mode then gives it the platform's dismissive treatment for free, because `.alert-button:last-child` is bold and every row already carries a hairline divider. Two-button confirm alerts are the exception the other way round - they stay in one horizontal row, where cancel first means cancel on the left. See GitHub issue #1393.
- **A surface rendered in place of the router outlet gets no height.** `ion-app` renders itself as `.ion-page`: an absolutely positioned flex column with `justify-content: space-between`. A routed page is sized by the `.ion-page` the router outlet puts on it, so a component swapped in for `<ion-router-outlet>` is the one child that receives nothing. Its host collapses, the `ion-content` inside resolves its `height: 100%` against that auto-height host and lays out at zero, and any `min-height: 100%` in the light DOM has no definite height to resolve against either - so a panel written to be vertically centred centres inside its own text and `space-between` pins it to the top. Give such a host the sizing the outlet would have given it, `position: absolute; inset: 0`, rather than reaching for `100dvh` at the inner box. The App Check gate is the case, and it looked centred in Storybook the whole time, because a story root supplies the height `ion-app` does not. See GitHub issue #1411.
- **An `[fullscreen]` content with no `ion-header` starts behind the status bar.** Ionic derives `--offset-top` from the header, so a content without one sits at `y = 0` and the top inset is nobody's job. The content has to carry it: `--padding-top: calc(1rem + var(--ion-safe-area-top, 0px))`, with the bottom counterpart for the navigation bar and the home indicator. Those variables are Ionic's mirror of `env(safe-area-inset-*)`, so one declaration covers the Android status bar and the iOS notch. Note that Ionic's own automatic bottom inset for a fullscreen content is applied by `ion-modal`, not by `ion-content`, so a bare content outside a modal never gets it. Same issue #1411.
- **A square-cornered border inside a rounded, clipped container leaves a gap.** `ion-card` clips its children to its own radius, which cuts a square border's corner arcs away instead of bending them. Give the inner element the same radius. A background fill hides the defect, which is why it usually surfaces only on an empty state. See GitHub issue #1251.

## Toasts

**Every toast goes through `ToastService` in `libs/common/toast`.** No call site builds its own `toastController.create` options; a `no-restricted-imports` rule in `eslint.config.mjs` blocks `ToastController` everywhere except the service itself and its spec.

The service owns the four things the fourteen former call sites disagreed on:

| Decision | Value                                            |
| -------- | ------------------------------------------------ |
| Position | `top`, for every toast in both apps              |
| Colour   | `success` or `danger`, from a required `outcome` |
| Duration | 5s for a success, 10s for a failure              |
| Message  | A Transloco key, looked up by the service        |

`outcome` is a required input, so a call site cannot raise an uncoloured toast. That was the actual defect in [issue #1305](https://github.com/muhammedgaygisiz/travellers-apps/issues/1305): only the two Bite paths passed a colour and nothing anywhere passed `danger`, so a failed registration, settings save or bucket-list write rendered in exactly the same grey as a success. The outcome of an action was not encoded visually at all and had to be read out of the message text.

Three details worth knowing before changing it:

- **`top` is a footer decision, not a majority one.** Twelve of the fourteen sites presented at the bottom, but the shared page chrome in `libs/common/ui/page` renders a persistent `ion-footer` carrying the menu entries and the add button, and a bottom toast lands on it. The Bite creation toast also sits better above the full-width photo card.
- **Failures stay up twice as long, deliberately.** A success confirms something the user just did and only has to be noticed; a failure carries a recovery instruction that has to be read, and it arrives when the user has already moved on. Both durations derive from one constant.
- **`present()` never rejects and always settles.** Every overlay call is bounded by a 2s timeout and every failure swallowed, so a flow can `await` a toast without the toast becoming what that flow depends on. This is the [[Current State - Known Issues]] #1219 guarantee, held once in the service instead of separately at each caller. A toast still on screen is dismissed before the next one, because Ionic stacks toasts at the same position.

A toast that leads somewhere passes an `action` instead, which replaces the dismiss button — the bucket-list save is the one example.

## Desktop Layout

`PageChromeConfig.desktopLayout` opts a page into the desktop layout in `libs/common/ui/page`. It is off by default, so pages that do not set it are unaffected at every width.

When it is on and the viewport is at least 1024px: the content column widens from 720px to a 1440px cap, the first three menu entries and the add button move from the hamburger and the footer bar into the header, the footer bar is released, and the brand moves to the start of the toolbar. Below the breakpoint the page renders exactly as it did before.

The switch is a media query only — no resize listener and no component state — so both variants exist in the DOM at once and CSS decides which is shown.

The breakpoint is repeated as a SCSS variable in `page.component.scss`, `bite-list.component.scss` and `home.component.scss`, which have no shared stylesheet between them. They have to change together. See GitHub issue #1250.

## App Data In The Shared Page Chrome

`libs/common/ui/page` is `scope:common`, so it cannot import an app's store or its domain model, and the menu popover it opens is created by `PopoverController` rather than by a template — there is no host binding to thread a value through either.

App-owned data reaches it through an injection token in `libs/common/utils`, injected `{ optional: true }` so an app that binds nothing still gets the chrome. `APP_TITLE` is the plain-value case; `SIGNED_IN_ACCOUNT` is the reactive one and carries a `Signal`, because the session changes while the chrome stays mounted. Each app binds it in its shell — `provideBiteTribeShell` maps the store's own profile onto it — and `PageComponent` forwards it into `componentProps` as a computed signal, which is what keeps an already-open popover on the live value instead of the one it was opened with. See GitHub issue #1260.

The account itself is reduced to `SignedInAccount` (display name and photo URL) rather than passed as a domain object, so the boundary carries the two fields the chrome renders and nothing that would pull a model into `scope:common`.

## Validation

Check every visual change in **both** light and dark mode. Most theming defects here are invisible in one of them. Storybook renders both and is the cheapest place to look.

## Related Pages

- [[Implementation - Feature Patterns]]
- [[Implementation - Storybook]]
- [[Architecture - Nx Workspace]]
