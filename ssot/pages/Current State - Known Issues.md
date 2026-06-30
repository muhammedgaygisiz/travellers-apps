# Current State - Known Issues

## Purpose

Known issues are the current launch risks or unfinished areas that should be visible while moving toward public release.

## Launch-Blocking Or Launch-Relevant Issues

| Area                 | Issue                                                                                                   | Why It Matters                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Firebase App Check   | Verified request ratio still needs monitoring and remaining issues need fixing before enforcement.      | Backend protection should be enabled without blocking legitimate app traffic.      |
| Location quality     | Bite location should be enriched using Google Places.                                                   | Discovery, search, restaurant context, and trust depend on usable location data.   |
| Currency quality     | Currency should be validated against location.                                                          | Prices should make sense for the place where a Bite was created or experienced.    |
| Bite photo upload    | [[issue-927]]: production can create a Bite document while the intended photo upload does not complete. | Bite creation is core to launch; missing photos make successful posts look broken. |
| Edge cases           | Vacation usage, posting later, and missing location need explicit testing.                              | Real users will create Bites outside the ideal happy path.                         |
| Analytics            | Events need to be defined, implemented, and verified.                                                   | Launch learning depends on reliable usage data.                                    |
| Production readiness | Android, iOS, and web testing remain before release candidate.                                          | Public launch requires confidence across supported platforms.                      |
| Store assets         | App Store and Google Play assets need preparation.                                                      | Publishing cannot complete without store-ready material.                           |

## Operational Issues To Watch

- Crashlytics should be monitored daily during soft launch.
- Analytics should be monitored daily during soft launch.
- Remaining launch blockers should be fixed before public launch communication expands.
- Onboarding and retention should be improved based on real usage signals after launch.

## Related Pages

- [[Current State - Roadmap]]
- [[Current State - Open Questions]]
- [[Current State - Release State]]
- [[Architecture - Firebase]]
- [[Architecture - Analytics]]
