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
- **A square-cornered border inside a rounded, clipped container leaves a gap.** `ion-card` clips its children to its own radius, which cuts a square border's corner arcs away instead of bending them. Give the inner element the same radius. A background fill hides the defect, which is why it usually surfaces only on an empty state. See GitHub issue #1251.

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
