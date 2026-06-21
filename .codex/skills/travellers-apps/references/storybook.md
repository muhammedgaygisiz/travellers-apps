# Storybook

Use Storybook as part of validation when changing shared components or user-visible component states.

## When To Update Stories

Check the component story under `libs/**/__specs__/*.stories.ts` when a component gains or changes:

- visible states such as empty, loading, disabled/read-only, selected/favorited, or error
- important input/mode combinations
- responsive or safe-area layout behavior
- localization-sensitive display

Prefer a compact state set that shows meaningful differences. Remove redundant stories when another story already covers the same behavior.

## Ionic Story Setup

Storybook renders components outside some app/runtime contexts. For Ionic components that normally live inside pages or modals, stories may need:

- `provideIonicAngular(getIonicConfig())`
- `addNecessaryIcons()` or targeted `addIcons(...)` when icons render in the component
- `ion-app` plus a height wrapper when rendering standalone `ion-content`

Example pattern:

```html
<ion-app>
  <div style="height: 100vh">
    <currency-selector />
  </div>
</ion-app>
```

If `ion-content` has no page/modal height context, lists can appear missing because the scroll area collapses. Fix the story wrapper or component host height before assuming the data is empty.

## Transloco

Do not replace the Storybook host's global Transloco provider with a partial local mock unless the story is intentionally isolated. The host config at `apps/storybook-host/.storybook/preview.ts` provides locale switching and translation loading for library stories.

## Validation

Validate story typing with:

```bash
npx tsc -p apps/storybook-host/.storybook/tsconfig.json --noEmit
```

If a full Storybook build is needed, use the Angular builder path:

```bash
NX_DAEMON=false npx nx run storybook-host:build-storybook --configuration=ci
```

If that Nx command sits silent on startup, stop it after a reasonable interval and report that it was blocked by Nx/project-graph behavior.

Do not use direct `npx storybook build` as a fallback in this workspace. Storybook 10 with Angular requires the configured Angular builder, and the direct CLI exits with the Angular legacy build-options error.
