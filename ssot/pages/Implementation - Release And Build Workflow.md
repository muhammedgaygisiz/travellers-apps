# Implementation - Release And Build Workflow

## Purpose

Release and build workflow describes the implementation-facing scripts that support build numbers, changelog output, Storybook, assets, and native wrappers.

## Npm Scripts

| Script                                                  | Purpose                                                |
| ------------------------------------------------------- | ------------------------------------------------------ |
| `npm run start`                                         | Serve an Nx app through the default serve target       |
| `npm run development`                                   | Start Firebase serve and the BiteTribe app together    |
| `npm run build`                                         | Run Nx build                                           |
| `npm run test`                                          | Run affected Nx tests against `develop`                |
| `npm run storybook`                                     | Start Storybook host                                   |
| `npm run build:storybook`                               | Build Storybook and refresh the Nx graph asset         |
| `npm run increment-build-number`                        | Increment the shared build number                      |
| `npm run generate-changelog`                            | Generate incremental changelog output                  |
| `npm run generate-full-changelog`                       | Generate full Logseq changelog output                  |
| `npm run increment-build-number-and-generate-changelog` | Increment build number and generate changelog together |
| `npm run cap:run:ios`                                   | Run Capacitor iOS                                      |
| `npm run cap:run:android`                               | Run Capacitor Android                                  |

## Native Asset Scripts

```text
npm run pwa-asset-generator:generate:bite-tribe
npm run ios-asset-generator:generate-ios:bite-tribe
```

## Rules

- Use the existing build-number scripts instead of editing generated release state manually.
- Use the changelog scripts for SSOT changelog pages.
- Use closed Priority P0 issue titles from the release week as the source for short TestFlight and Google Play build notes.
- Use Capacitor sync commands when native dependency or wrapper state changes.
- Keep source maps and native build artifacts traceable to the release build number and future git tag.
- Treat generated native files as outputs unless the requested change specifically targets native wrapper source.

## Related Pages

- [[Architecture - Capacitor]]
- [[Implementation - Testing]]
