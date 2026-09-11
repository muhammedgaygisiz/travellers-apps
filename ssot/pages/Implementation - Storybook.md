# Implementation - Storybook

## Purpose

Storybook documents and verifies reusable UI states outside the full app runtime.

It is especially important when shared UI components gain visible states, loading branches, empty states, layout modes, or new inputs.

## Location

```text
apps/storybook-host
libs/**/**/*.stories.ts
```

## When To Update Stories

Update or add stories when a change introduces:

- New shared UI component behavior
- Loading, empty, error, or disabled states
- New component inputs or outputs
- Layout variants
- Visual behavior that is hard to verify through unit tests alone

## Story Exports Are PascalCase

`eslint-plugin-storybook` has been installed for a long time but linted nothing: the block that enabled it was eslintrc syntax with a `files: ['*.stories.*']` glob that never matched a nested story. It was reinstated as flat config in issue #1379, and its `flat/recommended` rules now run over every `**/*.stories.*`.

That surfaced 25 camelCase story exports, all renamed to PascalCase. **This rename is safe to repeat and safe to ignore in reviews of Loki output.** Storybook derives a story's display name from its export with `startCase`, and `startCase('imageLoaded')` and `startCase('ImageLoaded')` are both `Image Loaded` — so the story name, the story id, and the `.loki/reference` filename are byte-identical either way. Renaming a story export from camelCase to PascalCase never invalidates a visual reference; renaming it to a _different word_ does.

`storybook/no-uninstalled-addons` is configured in `apps/storybook-host/eslint.config.mjs` rather than the root config. It resolves its `packageJsonLocation` against `process.cwd()`, and the inferred `lint` target sets that to the project root, which has no `package.json` of its own — see the basePath trap in [[Architecture - Nx Workspace]].

## Story Data Must Not Move On Its Own

Every story is a committed visual reference under `.loki/reference`, so a story
whose render depends on the wall clock fails the visual job on a calendar
boundary with no code change behind it, and the failure looks like a regression
in whatever was pushed that day.

Pin a story's time-dependent data to an **offset from now**, never to a fixed
date:

```ts
const isoAgo = (ms: number): string => new Date(Date.now() - ms).toISOString();

createdAt: isoAgo(5 * MINUTE_MS); // always renders "5 min. ago"
```

A fixed date renders a different string every time the calendar crosses the
next unit boundary. The Bite details stories carried exactly that: the relative
timestamp was measured against a hardcoded `2025-05-17` fallback, so their
references aged from `1 y ago` to `1 y 2 m ago` on their own. See issue \#1272.

Keep the offset comfortably inside its unit band, so a slow render cannot tip
it into the next one.

## A Story Has To Reproduce The Component's Container

Storybook mounts a story under its own root, which is a block with a definite
height. The app mounts the component wherever the app mounts it. When a
component depends on something its container gives it - a height, a positioning
context, a platform inset - the two disagree, and the story renders a layout the
device never produces.

The App Check gate is the case. It is rendered inside `ion-app` in place of the
router outlet, and `ion-app` hands its children no height, so on the device the
panel collapsed and sat under the status bar. The story, mounted on Storybook's
sized root, centred it perfectly - through four committed reference images and
every review that looked at them. See issue \#1411.

Wrap the story in the container the component actually lives in, and import the
Ionic element through `moduleMetadata` so the wrapper template resolves:

```ts
componentWrapperDecorator((story) => `<ion-app>${story}</ion-app>`);
```

Platform insets are the same problem and take the same treatment. Ionic mirrors
them onto `--ion-safe-area-*`, which is inherited, so a wrapper that declares
them puts a story on a device's geometry without a device:

```ts
const inset = '--ion-safe-area-top: 35px';
componentWrapperDecorator((story) => `<div style="${inset}">${story}</div>`);
```

They resolve to `0px` in a desktop browser, so a story that never declares them
cannot show whether a full-screen surface clears the system bars.

## The Admin And Business Apps Are Baselined At Desktop Only

Storybook hosts all three apps. Their stories are separated by the top-level
story title, and the namespace is also the mechanism that keeps the two
privileged apps off the phone configuration:

```text
Pages/*, Components/*   the consumer app and the shared UI
Admin/*                 bite-tribe-admin
Business/*              bite-tribe-business
```

`loki.config.js` carries `skipStories: '^(Admin|Business)/'` on the
`chrome.iphone7` configuration. Loki matches that regex per configuration
against `kind + ' ' + name`, so the two apps baseline at `chrome.laptop` and
nowhere else. Both are opened on a laptop by an operator or a restaurant, and
neither ships as a native build, so a phone reference asserts a layout nobody
uses. This is **not** `parameters.loki.skip`, which drops a story from every
configuration including the laptop one.

Give an `Admin/*` or `Business/*` story the app's own `APP_TITLE` -
`'BiteTribe Admin'` or `'Bite Tribe Business'` - or the page header renders
without a title, which no build of either app does.

### A Story-Level Viewport Does Not Reach Loki

`parameters.viewport` drives manual Storybook browsing only. Loki loads
`iframe.html?id=...` directly and sizes the browser itself from
`configurations` in `loki.config.js`, so the viewport addon never runs.

The New Restaurant story used to be a `TwoColumn` / `Stacked` pair, each
declaring its own viewport to document the `lg` breakpoint. All four committed
references were two distinct images: `chrome_laptop_*_Stacked.png` and
`chrome_laptop_*_Two_Column.png` were byte-identical, and so were the iphone7
pair. A responsive split is browsed through the viewport toolbar; it is
baselined by adding a Loki configuration, never by adding a story (issue
\#1547).

## A Dark Story Cannot Switch The Document

Both apps carry their dark palette on `html.dark` and on
`prefers-color-scheme`, and a story that needs a dark reference can reach
neither. Loki selects one story after another **without reloading the page**,
so a class left on `document.documentElement` darkens every reference captured
after it, and a media query is the runner's setting rather than the story's.

Put the palette on the story's own element instead, and list only the variables
the component actually draws from - for the canvas that is the background, the
ink, the ink as `rgb` components and the primary colour:

```ts
const DARK = '--ion-background-color: #1a1c22; --ion-text-color: #ffffff';

componentWrapperDecorator((story) => `<div style="${DARK}">${story}</div>`);
```

The floor-plan canvas is baselined this way (issue \#1089). The same decorator
shape gives a `filter: grayscale(1)` story, which is how a plan that must not
carry meaning in a colour alone is asserted rather than promised - and it is
the state the plan is printed in.

Note what this does **not** prove: a component whose dark rendering comes from
a variable it does not name here renders light inside the wrapper, so the list
is part of the assertion. It is worth writing the story only for a surface
whose colours all resolve from a handful of variables.

## Storybook Serves Three Translation Catalogues

Each app ships its own Transloco catalogue, and all three are named `en.json`,
so they cannot share one served path. `main.ts` maps them to `/assets/i18n`,
`/assets/i18n-admin` and `/assets/i18n-business`, and `transloco-loader.ts`
fetches all three and merges them with the **consumer catalogue last**, so it
wins the handful of keys that exist in more than one app with different wording
(`app-check-blocked-message`, the language names,
`restaurant-selector-nearby-google`). That ordering is what keeps every
committed consumer reference byte-identical.

Before this, only the consumer catalogue was served and the single admin story
baselined raw keys - the committed reference read `about-restaurant` and
`prefill-from-google-places` where the app shows English (issue \#1547).

The admin and business apps ship `en.json` only, so any other locale 404s two
of the three requests; the loader swallows those so the consumer catalogue
still resolves. Loki is unaffected either way: it renders every story at the
default locale.

## Validation

Build Storybook when UI stories are part of the change:

```bash
npm run build:storybook
```

For local visual inspection:

```bash
npm run storybook
```

## Driving A Story To Prove Behaviour

A story is also the fastest way to reproduce and prove a UI defect in a real
browser **without signing in**, which matters for flows that sit behind auth and
for Ionic overlay lifecycle bugs that do not reproduce in jsdom at all.

The `storybook` target serves on port **4400**. Navigate straight to the story's
iframe to skip the Storybook chrome:

```text
http://localhost:4400/iframe.html?id=<story-id>&viewMode=story
```

The story id is the kebab-cased `title` plus the export name — `Components/Bite`
and `export const Bite` give `components-bite--bite`.

Storybook serves a development build, so Angular's global debug utilities are
present and the component instance is reachable:

```js
const cmp = window.ng.getComponent(document.querySelector('bt-bite'));
cmp.biteClick.subscribe((v) => (window.__x ??= []).push(v));
```

Subscribing to an `output()` this way turns "it looks right" into a hard
pass/fail signal. Verified on 25 August 2026 against `components-bite--bite`:
`window.ng` exposes `getComponent`, `ngDevMode` is live, and `getComponent`
resolves `BiteComponent` with all six of its outputs subscribable.

Note the contrast with a production bundle, where `window.ng` is **absent** — see
[[Implementation - Android Device Testing]], where application state has to be
reached through the DOM or the Capacitor bridge instead. Checking out the
pre-fix files with `git checkout HEAD -- <files>` reproduces the old behaviour on
the same story, which gives a before/after on one page.

## Verifying Capacitor Plugin Behaviour On Web

When a fix depends on what a Capacitor plugin actually does on web — filesystem
paths, IndexedDB keys, exact error messages — bundle a throwaway script against
the real plugin rather than reasoning from its source. There is no
`fake-indexeddb` in this workspace, so a Jest run cannot exercise the web
implementation at all.

esbuild cannot resolve bare specifiers from a scratch directory outside the
repository, and `--node-paths` and `--absolute-paths` are not real flags.
Aliasing to the concrete `dist/esm` entry is what works:

```bash
npx esbuild scratch/main.ts --bundle --format=esm --outfile=scratch/main.js \
  --alias:@capacitor/filesystem=$PWD/node_modules/@capacitor/filesystem/dist/esm/index.js \
  --alias:@capacitor/core=$PWD/node_modules/@capacitor/core/dist/index.js
```

Serve the directory from a temporary entry in `.claude/launch.json`, which is
gitignored, then remove the entry afterwards.

## Related Pages

- [[Implementation - Android Device Testing]]
- [[Implementation - Feature Patterns]]
- [[Implementation - Ionic Patterns]]
- [[Implementation - Testing]]
