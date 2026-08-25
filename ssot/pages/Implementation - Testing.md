# Implementation - Testing

## Purpose

Testing should prove the changed contract with the smallest reliable command.

## Default Validation Order

1. Identify touched projects with `git diff --name-only`.
2. Read the nearest `project.json` for the actual Nx project name.
3. For narrow Jest-only library changes, prefer the direct Jest command against the project's own `jest.config.ts` or `jest.config.cts`.
4. Run focused Nx tests when the project graph behavior itself needs coverage or when a target has no direct equivalent.
5. Fall back to direct Jest when Nx is silent, slow, or blocked by project graph issues.
6. Run specialized validation for Firebase Functions, locale JSON, Storybook, or native sync when the touched files require it.
7. Finish with `git diff --check`.

## Focused Nx Test

```bash
NX_DAEMON=false npx nx test "<project-name>" --runInBand
```

Run one Nx target at a time.

If Nx starts without useful output for roughly 10 seconds, stop it and use the direct command for the touched project. Report that Nx was bypassed because of the recurring silent startup/project-graph stall.

## Where The Test Target Comes From

`project.json` no longer declares a Jest target. `@nx/jest/plugin` infers one `test` target per project from the `jest.config.{ts,cts}` sitting in the project root (issue #1379), and `nx.json` `targetDefaults.test` carries the shared cache inputs, `passWithNoTests`, and the `ci` configuration. Read [[Architecture - Nx Workspace]] for the inference rule and the two excluded roots.

Two consequences for validation:

- `nx show project <name>` is the only accurate view of a `test` target. Reading `project.json` will show you no Jest target at all.
- The Nx target now shells out to `jest` with `cwd` set to the project root, so the direct fallback below runs the same Jest that Nx runs.

## Direct Jest Fallback

Find the touched project's `jest.config.ts` or `jest.config.cts` in its root, then run it directly.

For small Angular/Ionic library edits, this direct Jest path is acceptable as the primary validation command. It preserves the project's Jest transform/setup while avoiding the recurring Nx daemon/project-graph startup stall.

Examples:

```bash
npx jest --config libs/bite-tribe/profile/page/jest.config.ts --runInBand
npx jest --config libs/bite-tribe/api/jest.config.ts --runInBand
npx jest --config libs/bite-tribe/search/data-access/jest.config.ts --runInBand
```

## Other Checks

| Change Type                      | Check                                                                            |
| -------------------------------- | -------------------------------------------------------------------------------- |
| Firebase Functions               | `npm run build` and `npm run lint` from `apps/bite-tribe-firebase/functions`     |
| Locale JSON                      | Parse all touched locale files with Node                                         |
| Storybook UI                     | `npm run build:storybook`; add direct `npx loki test` when visual output matters |
| Consumer app E2E                 | `NX_DAEMON=false npx nx e2e bite-tribe-e2e`                                      |
| Business app E2E                 | `NX_DAEMON=false npx nx e2e bite-tribe-business-e2e`                             |
| Capacitor native wrapper changes | `npx cap sync android` or the relevant Capacitor sync target                     |
| Markdown/docs                    | `git diff --check`                                                               |

## Playwright E2E

There are two Playwright projects, one per app:

| Project                        | App                   | Dev server | Suite scope           |
| ------------------------------ | --------------------- | ---------- | --------------------- |
| `apps/bite-tribe-e2e`          | `bite-tribe`          | `:4200`    | Consumer app journeys |
| `apps/bite-tribe-business-e2e` | `bite-tribe-business` | `:4300`    | Business app journeys |

Playwright is the only supported E2E framework. Put new consumer and business-app E2E scenarios in Playwright. The legacy Cypress business project has been removed; do not reintroduce Cypress or `@nx/cypress` during later Nx migrations.

Both E2E targets start the Firebase emulators and their app's Angular dev server before running browser tests. Use them when validating launch-critical flows such as login, registration, creating a Bite, or maintaining a Restaurant through the real UI.

The two suites share **one** emulator stack (`bite-tribe-firebase`, same ports, same `.firebase-export` seed). They are kept as separate projects, and as separate CI jobs, so they never contend for those ports. Never run them at the same time.

Each suite owns its own `src/support` helpers and page objects. That duplication is deliberate: a business journey must not be able to break the consumer suite, and vice versa.

### Run It Serially Locally

`nxE2EPreset` sets `workers: 1` and `retries: 2` only when `CI` is set. Locally there is no `CI`, so Playwright defaults to CPU/2 workers and runs every spec in parallel against **one** Firebase emulator and the **same** seeded users. That is flaky: specs pass individually and fail together.

Run the suite serially when a local result has to be trustworthy:

```bash
npx nx e2e bite-tribe-e2e --workers=1
npx nx e2e bite-tribe-business-e2e --workers=1
```

A local red suite is not evidence of a regression until it has been reproduced serially. Do not draw conclusions by comparing a parallel full-suite run against a single `--grep` run: those differ in more than the code being tested.

### Emulator Recovery

An aborted run leaves the emulators holding their ports while the emulator UI on `4000` is gone, so Playwright can neither reuse nor restart them and the next run fails with `Could not start Firestore Emulator, port taken`.

```bash
npx nx firebase-kill bite-tribe-firebase
```

Never run two E2E suites at once — including `bite-tribe-e2e` alongside `bite-tribe-business-e2e`. They share the emulator ports, and the results of both become meaningless.

## Loki Visual Regression

Storybook visual regression uses the upstream `loki` package from `oblador/loki` directly.

Target command contract:

```bash
npx loki test
npx loki update
```

Expose these through repository scripts and use those scripts in CI. Do not register `nx-loki`, infer Loki targets, or route Loki through `nx run-many`. Preserve the existing reference-update pull-request workflow when replacing the invocation.

Two boundary details keep direct Loki working against the Angular Storybook 10 host; do not remove them without a replacement:

- `tools/loki.mjs` serves the built Storybook and points Loki at `host.docker.internal`, so the same `loki:*` script works locally and in CI regardless of the machine's network interfaces.
- `apps/storybook-host/.storybook/loki-getstories-shim.ts` re-exposes the `storyStore.raw()` method that Loki 0.35's story enumeration expects but Storybook 10 removed. Without it, `loki test`/`loki update` fail with "Unable to get stories".
- `apps/storybook-host/src/assets/fonts/noto-color-emoji-subset.woff2` is a self-hosted Noto Color Emoji subset loaded only in Storybook (via `.storybook/preview-head.html`), so references show consistent colour emoji regardless of the Docker Chrome's installed fonts. `'Noto Color Emoji'` is listed in the app emoji font stack (`theme/variables.scss`); production ships no `@font-face` for it, so production emoji rendering is unchanged. Extend the subset (see the font folder README) if a new story renders a new emoji.
- `loki.config.js` sets `fetchFailIgnore` to ignore failed requests from every host except the served Storybook build. Loki fails a story on any failed request, and stories legitimately load third-party resources (OpenStreetMap tiles, web fonts, remote images) that visual references must not depend on. A genuinely missing bundled asset (same origin) still fails. Note: references stay deterministic only while those external resources render consistently; mock them in stories if that becomes flaky.

### Operating Loki

Three behaviours that have each cost a wrong conclusion at least once.

**Use `loki:approve`, not `loki:update`, to accept a diff.** `tools/loki.mjs`
forwards its command straight to the upstream CLI with no story filter, so
`loki update` re-captures **every** story and rewrites references that were never
in the failure set. A reference that was passing is silently rebaselined along
with the one being fixed, which can bless a real regression that nobody looked
at. `loki approve` promotes only what is sitting in `.loki/difference`. If
`loki:update` has already been run, restore the references that were not part of
the failure set before committing.

**A story that renders the Leaflet map must set `parameters: { loki: { skip: true } }`.**
Markers never paint in Loki's Docker Chrome, so a baseline locks in a blank grey
rectangle instead of the markers the story exists to show. See
`libs/bite-tribe-common/map/src/lib/map/__specs__/map.component.stories.ts`, which
carries the skip and the reason. The device is where map rendering gets confirmed
instead — see [[Implementation - Android Device Testing]].

**A skeleton in a reference image is not automatically a regression.**
`loki-getstories-shim.ts` carries a settle gate precisely because an `@defer`
block's `@placeholder (minimum <n>ms)` outlives a naive settle check, and Loki
would otherwise capture the placeholder for some viewports and the resolved
content for others. Before treating a skeleton diff as a bug, check whether the
committed reference already shows a skeleton.

## Related Pages

- [[Architecture - Testing]]
- [[Current State - E2E Coverage]]
- [[Implementation - Android Device Testing]]
- [[Implementation - Firebase Functions]]
- [[Implementation - Storybook]]
- [[Current State - Nx And Dependency Migration Roadmap]]
