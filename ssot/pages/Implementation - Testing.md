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

| Change Type                      | Check                                                                        |
| -------------------------------- | ---------------------------------------------------------------------------- |
| Firebase Functions               | `npm run build` and `npm run lint` from `apps/bite-tribe-firebase/functions` |
| Locale JSON                      | Parse all touched locale files with Node                                     |
| Storybook UI                     | `npm run build:storybook`                                                    |
| Consumer app E2E                 | `NX_DAEMON=false npx nx e2e bite-tribe-e2e`                                  |
| Capacitor native wrapper changes | `npx cap sync android` or the relevant Capacitor sync target                 |
| Markdown/docs                    | `git diff --check`                                                           |

## Playwright E2E

`apps/bite-tribe-e2e` uses Playwright for consumer app smoke coverage.

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

## Related Pages

- [[Architecture - Testing]]
- [[Implementation - Firebase Functions]]
- [[Implementation - Storybook]]
