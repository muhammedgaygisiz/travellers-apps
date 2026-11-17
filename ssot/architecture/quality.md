# Architecture - Quality

## Purpose

What BiteTribe's architecture is optimised for, in which order, and how each goal is
measured. This page holds the quality goals of arc42 section 1 and the quality requirements
of section 10. A trade-off between two ways of building something is decided against the
goals here, in their rank order.

The goals were ranked by the maintainer on [#2067]. Why these three, why in this order, and
what was considered and left out are `RD-QG-*` in
[Recorded Decisions](../decisions/recorded-decisions.md). Systems are named as
[Architecture - Context](context.md) names them.

**Verified against the code on 17 November 2026**, branch `develop` at `fcb7452d`: the
timeouts in `libs/common/geolocation` and `libs/bite-tribe/store`, the specs each scenario
names, the budgets in `apps/bite-tribe/project.json`, and the jobs in
`.github/workflows/pipeline.yml`.

## Quality Goals

| Rank | Goal                   | What it means for BiteTribe                                                                                                                                       | Decided in |
| ---- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1    | Security               | Data is read or changed only where a Firestore or Storage rule, App Check and the callable in front of it allow it, never because an identifier is hard to guess. | `RD-QG-1`  |
| 2    | Performance efficiency | The main flows answer within seconds on a mid-range phone, and the consumer app stays small enough to load.                                                       | `RD-QG-1`  |
| 3    | Reliability            | No flow hangs: a read that cannot finish ends in a named failure, and a write made offline is kept and applied once the device is back online.                    | `RD-QG-1`  |

When two of them conflict, the higher one wins: a faster app does not trade away a security
rule, and a lighter or faster app is preferred to a more robust one.

## Quality Scenarios

Each scenario is a stimulus, the response the system gives, and the measure the response is
held to. `Evidence` names the test, CI check or build budget that fails when the scenario
stops holding; `Not enforced` means nothing does yet. A number another page owns is linked
there and repeated only where the scenario cannot be read without it.

The performance targets QS-4 to QS-6 are measured on the two physical devices of
[Current State - Release Candidate Test Charter](../current-state/release-candidate-test-charter.md),
the Samsung SM-A566B and the iPhone 12 mini, on an ordinary Wi-Fi or mobile connection,
against production data (`RD-QG-3`).

| #     | Goal                   | Stimulus                                                                                                       | Response                                                                                                                 | Measure                                                                                                                                  | Evidence                                                                                                                                                                                                                                     |
| ----- | ---------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| QS-1  | Security               | A client reads or writes a Firestore document or Storage object that the rules do not grant it                 | The read or write is refused                                                                                             | Every time; a ruleset that lets one through is never deployed                                                                            | The `firestore-rules` job in `pipeline.yml` runs `firestore-rules.emulator-spec.ts` and `storage-rules.emulator-spec.ts` on every pull request, and `deploy-firestore-rules` needs it                                                        |
| QS-2  | Security               | A signed-in account calls a callable its role, association or sign-in provider does not admit                  | The callable refuses it                                                                                                  | Every callable; a new one fails the build until it is classified                                                                         | `callable-authorization.spec.ts`                                                                                                                                                                                                             |
| QS-3  | Security               | A client without a valid App Check token calls a callable, or a web bundle is built without the App Check gate | The call is refused; the bundle is not released                                                                          | Every callable outside the Functions emulator; every released web and native bundle                                                      | `callable-options.spec.ts`; `npm run release:verify-bundle`, per [Implementation - Release And Build Workflow](../implementation/release-and-build-workflow.md)                                                                              |
| QS-4  | Performance efficiency | A member whose device has a location fix opens Home                                                            | The feed shows Bites                                                                                                     | Within 5 s (`RD-QG-3`)                                                                                                                   | `Not enforced`                                                                                                                                                                                                                               |
| QS-5  | Performance efficiency | A member taps a Bite card                                                                                      | The details page shows the Bite's photo, name and place                                                                  | Within 2 s (`RD-QG-3`)                                                                                                                   | `Not enforced`                                                                                                                                                                                                                               |
| QS-6  | Performance efficiency | A member saves a new Bite                                                                                      | The Bite appears in My Bites while its photo is still uploading                                                          | Within 1 s (`RD-QG-3`)                                                                                                                   | `Not enforced`                                                                                                                                                                                                                               |
| QS-7  | Performance efficiency | A change grows the consumer app's initial bundle                                                               | The production build fails                                                                                               | Above the error budget of the `Bundle Budget Rule` in [Architecture - Nx Workspace](nx-workspace.md), 3 MB (`RD-QG-4`)                   | The budget in `apps/bite-tribe/project.json`, built by the `build` job when `bite-tribe` is affected and by `deploy-bite-tribe` on every push to `develop`                                                                                   |
| QS-8  | Reliability            | A member opens Home and the device produces no position fix, or the feed load never answers                    | The feed leaves the loading state for a named failure                                                                    | Within the bounds [UC - Discover Bites](../use-cases/uc-discover-bites.md) owns, 15 s for the position and 20 s for the load (`RD-QG-5`) | `geolocation.spec.ts` in `libs/common/geolocation` and `effects.spec.ts` in `libs/bite-tribe/store`. Both assert against the exported constant, so they prove the read and the load give up at the bound, not that the bound is 15 s or 20 s |
| QS-9  | Reliability            | A member retries a Bite's photo upload while its Firestore write is not yet acknowledged, as when offline      | The upload starts without waiting for the acknowledgement, and an upload that stalls is marked failed and can be retried | Within the stall timeout [UC - Create And Maintain Personal Bites](../use-cases/uc-create-and-maintain-personal-bites.md) owns           | `bite-data-access.service.spec.ts`, `while the pending write is not acknowledged yet`                                                                                                                                                        |
| QS-10 | Reliability            | A member writes on any other path that has to keep working offline                                             | The flow carries on with the local state instead of awaiting the server                                                  | Every such path                                                                                                                          | `Not enforced`                                                                                                                                                                                                                               |

## Rules That Serve A Goal

Rules that exist for one of the goals stay on the page that owns them. This table links them
so the reason for each is visible; it does not restate them.

| Rule                                                                                                | Owned by                                                                                       | Serves                 |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------- |
| Access is decided by Firestore and Storage rules, deployed from CI after their tests                | [Architecture - Firebase](firebase.md)                                                         | Security               |
| App Check is enforced, and a third-party API it cannot reach is protected by its callable           | [UC - Harden Platform And Backend Trust](../use-cases/uc-harden-platform-and-backend-trust.md) | Security               |
| A released bundle carries no dev-only key and does carry the App Check gate                         | [Implementation - Release And Build Workflow](../implementation/release-and-build-workflow.md) | Security               |
| `Bundle Budget Rule` and `Lazy Library Rule`                                                        | [Architecture - Nx Workspace](nx-workspace.md)                                                 | Performance efficiency |
| Measure on the device, against real data; derivations, fuzzy matching, cost bounded by the request  | [Implementation - Performance Guidelines](../implementation/performance-guidelines.md)         | Performance efficiency |
| A reducer returns the same state when nothing changed; a derived read model belongs to its producer | [Architecture - State Management](state-management.md)                                         | Performance efficiency |
| `Offline Write Rule`                                                                                | [Architecture - Data Access](data-access.md)                                                   | Reliability            |
| Every step of a feed load is bounded in time and ends in Bites or a named failure                   | [UC - Discover Bites](../use-cases/uc-discover-bites.md)                                       | Reliability            |

## Code Anchors

```text
apps/bite-tribe/project.json
libs/common/geolocation/src/lib/geolocation.spec.ts
libs/bite-tribe/store/src/lib/bites/__specs__/effects.spec.ts
libs/bite-tribe/bite/data-access/src/lib/__specs__/bite-data-access.service.spec.ts
apps/bite-tribe-firebase/functions/src/firestore-rules/__specs__/firestore-rules.emulator-spec.ts
apps/bite-tribe-firebase/functions/src/storage-rules/__specs__/storage-rules.emulator-spec.ts
apps/bite-tribe-firebase/functions/src/__specs__/callable-authorization.spec.ts
apps/bite-tribe-firebase/functions/src/functions/shared/__specs__/callable-options.spec.ts
tools/assert-release-bundle.mjs
.github/workflows/pipeline.yml
```

## Related Pages

- [Recorded Decisions](../decisions/recorded-decisions.md)
- [Principles](../product/principles.md)
- [Architecture - Context](context.md)
- [Architecture - Overview](overview.md)
- [Architecture - Firebase](firebase.md)
- [Architecture - Nx Workspace](nx-workspace.md)
- [Architecture - Data Access](data-access.md)
- [Implementation - Performance Guidelines](../implementation/performance-guidelines.md)
- [Current State - Release Candidate Test Charter](../current-state/release-candidate-test-charter.md)

[#2067]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2067
