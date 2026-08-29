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
