# Implementation - Testing

## Purpose

Testing should prove the changed contract with the smallest reliable command.

## Default Validation Order

1. Identify touched projects with `git diff --name-only`.
2. Read the nearest `project.json` for the actual Nx project name.
3. For narrow Jest-only library changes, prefer the direct Jest command from the owning project's `jestConfig`.
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

## Direct Jest Fallback

Read the touched project's `project.json`, then run its Jest config directly.

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
| Capacitor native wrapper changes | `npx cap sync android` or the relevant Capacitor sync target                     |
| Markdown/docs                    | `git diff --check`                                                               |

## Playwright E2E

`apps/bite-tribe-e2e` uses Playwright for consumer app smoke coverage.

Playwright is the only supported E2E framework. Put new consumer and business-app E2E scenarios in Playwright. The legacy Cypress business project has been removed; do not reintroduce Cypress or `@nx/cypress` during later Nx migrations.

The E2E target starts the Firebase emulators and the Angular dev server before running browser tests. Use it when validating launch-critical flows such as login, registration, and creating a Bite through the real UI.

### Run It Serially Locally

`nxE2EPreset` sets `workers: 1` and `retries: 2` only when `CI` is set. Locally there is no `CI`, so Playwright defaults to CPU/2 workers and runs every spec in parallel against **one** Firebase emulator and the **same** seeded users. That is flaky: specs pass individually and fail together.

Run the suite serially when a local result has to be trustworthy:

```bash
npx nx e2e bite-tribe-e2e --workers=1
```

A local red suite is not evidence of a regression until it has been reproduced serially. Do not draw conclusions by comparing a parallel full-suite run against a single `--grep` run: those differ in more than the code being tested.

### Emulator Recovery

An aborted run leaves the emulators holding their ports while the emulator UI on `4000` is gone, so Playwright can neither reuse nor restart them and the next run fails with `Could not start Firestore Emulator, port taken`.

```bash
npx nx firebase-kill bite-tribe-firebase
```

Never run two E2E suites at once. They share the emulator ports and the dev server, and the results of both become meaningless.

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
- `loki.config.js` sets `fetchFailIgnore` to ignore failed requests from every host except the served Storybook build. Loki fails a story on any failed request, and stories legitimately load third-party resources (OpenStreetMap tiles, web fonts, remote images) that visual references must not depend on. A genuinely missing bundled asset (same origin) still fails. Note: references stay deterministic only while those external resources render consistently; mock them in stories if that becomes flaky.

## Related Pages

- [[Architecture - Testing]]
- [[Implementation - Firebase Functions]]
- [[Implementation - Storybook]]
- [[Current State - Nx And Dependency Migration Roadmap]]
