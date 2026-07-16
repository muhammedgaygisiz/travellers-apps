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

## Validation

Check every visual change in **both** light and dark mode. Most theming defects here are invisible in one of them. Storybook renders both and is the cheapest place to look.

## Related Pages

- [[Implementation - Feature Patterns]]
- [[Implementation - Storybook]]
- [[Architecture - Nx Workspace]]
