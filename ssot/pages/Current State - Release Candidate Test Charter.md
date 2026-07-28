# Current State - Release Candidate Test Charter

## Purpose

This charter defines the platform test pass that has to be executed before the release candidate is cut. It exists so that "Android, iOS and web tested" on the readiness checklist in [[Current State - Release State]] means a recorded run against a named build, on named devices, with a named result, instead of an informal click-through.

It covers issue 1176 and belongs to issue 911 under [[epic-907]].

## Build Under Test

| Property              | Value                                                                  |
| --------------------- | ---------------------------------------------------------------------- |
| App identifier        | `com.bitetribe.app`                                                    |
| Marketing version     | 1.0.1                                                                  |
| Build number          | 88                                                                     |
| Configuration         | Production, built by CI, never from a workstation                      |
| Backend               | Production Firebase project, not the emulator                          |
| App Check             | `NX_APP_BITE_TRIBE_APP_CHECK_ENFORCED` on for the enforced-mode checks |
| Android minimum SDK   | 24                                                                     |
| iOS deployment target | 15.6                                                                   |

Record the actual version, build number and commit SHA used, because the numbers above change with every build increment.

A workstation-built production bundle is not a valid subject for this pass. The environment plugin inlines whatever it is given at build time, and [[Current State - Known Issues]] records that a local build is exactly how a debug token would ship. Web verification against the emulator is a preparation step, not the pass.

## Device Matrix

Fill in the actual hardware during execution. The minimum is one physical device per native platform; simulators and emulators do not count for permissions, notifications, camera or App Check.

| Platform | Device | OS version | Physical or virtual | Notes                        |
| -------- | ------ | ---------- | ------------------- | ---------------------------- |
| iOS      |        |            | Physical            | Must be a real device        |
| iOS      |        |            | Simulator           | Optional second OS version   |
| Android  |        |            | Physical            | Must be a real device        |
| Android  |        |            | Emulator            | Optional older API level     |
| Web      |        |            |                     | Chrome, plus Safari on macOS |

Cover the oldest supported OS if a device is available. The lowest supported levels are Android API 24 and iOS 15.6, and neither has ever been exercised deliberately.

## Test Data And Accounts

- One fresh account registered during the pass, used for the onboarding and first-run checks.
- One established account with Bites, followers, a bucket list and a leaderboard position.
- One account on the business app if the business checks are executed.
- Record which account was used for which check, since several defects only appear on a first-run account.

## Web

1. Run the full Playwright suite serially with `npx nx e2e bite-tribe-e2e --workers=1`. A parallel local run is not evidence; see [[Implementation - Testing]].
2. Repeat the critical journeys manually against a production-configuration build: registration, onboarding, login, create a Bite with a photo, Bite details, search, map, bucket list, profile, settings.
3. Check the privacy policy page and the account deletion flow.
4. Confirm no console errors and no failed network requests on the main journeys.

## Android

Install the CI-built artifact on a physical device, then execute:

1. Registration, the blocking onboarding assistant, and continuation to the home page.
2. Login, logout, and session restore after a cold start.
3. Create a Bite with a photo, including the upload failure state and both retry paths.
4. Location permission grant and denial, currency prefill from position, and manual currency override.
5. Map view, marker selection, the Bite drawer, and camera stability while live updates arrive.
6. Search for Bites, restaurants and cities.
7. Bucket list add, swipe to tick, and undo.
8. Notification permission, and delivery of a ranking-change notification. Issue 971 landed these but device delivery is still unverified.
9. Deep links into Bite details and profiles.
10. Privacy policy and account deletion end to end.
11. Restaurant menus and local gallery support, which have no Playwright coverage at all.
12. App Check in enforced mode: a working session, then the retry gate when the token is refused.

## iOS

Execute the same twelve checks on a physical device, plus:

13. The iOS permission prompts for photos, location and notifications, including the deny-then-enable-in-Settings path.
14. Behavior after backgrounding and returning, and after a force quit.

## Edge Cases

These are named on the readiness checklist and have never been tested explicitly:

- Vacation usage: create Bites far from the home location, across a currency boundary.
- Posting later: create a Bite for a place visited earlier, with the position no longer matching.
- Missing location: no permission, no signal, and a location that resolves to nothing usable.

## Business App

The business app has no Playwright coverage. Cover at minimum restaurant maintenance and BiteTrail creation manually, or record explicitly that the business app is out of scope for this release candidate.

## Monitoring

- Force a test crash per platform and confirm it reaches Crashlytics.
- Verify the analytics events in DebugView from a real device, not only from the web build.
- Confirm the key metrics dashboard exists and receives data.

## Pass Criteria

- Every check above is executed and recorded as pass, fail, or not applicable, with the reason.
- No open defect that prevents registration, login, Bite creation with a photo, or app start.
- Crashlytics and analytics receive data from every platform.
- No crash observed on a supported OS version during the pass.

Anything else found is filed, triaged, and either fixed under issue 1177 or accepted as a known issue.

## Result Log

Record one row per platform per execution. Keep previous rows when re-running after fixes.

| Date | Platform | Build | Device | Result | Defects filed |
| ---- | -------- | ----- | ------ | ------ | ------------- |
|      |          |       |        |        |               |

## Defect Handling

- File every defect as its own issue and link it to issue 1176.
- Mark it Priority P0 only if it blocks the release candidate against the pass criteria above.
- Fix release-candidate blockers under issue 1177, not on this branch.
- Move anything accepted into [[Current State - Known Issues]] before the release candidate is cut.

## Related Pages

- [[Current State - Release State]]
- [[Current State - Known Issues]]
- [[Current State - E2E Coverage]]
- [[Implementation - Testing]]
- [[Implementation - Release And Build Workflow]]
- [[epic-907]]
