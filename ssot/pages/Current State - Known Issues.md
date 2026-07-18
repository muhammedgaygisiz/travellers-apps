# Current State - Known Issues

## Purpose

Known issues are the current launch risks or unfinished areas that should be visible while moving toward public release.

## Launch-Blocking Or Launch-Relevant Issues

| Area                 | Issue                                                                                                                                                                                                                                 | Why It Matters                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Firebase App Check   | Verified request ratio still needs monitoring and remaining issues need fixing before enforcement.                                                                                                                                    | Backend protection should be enabled without blocking legitimate app traffic.      |
| Location quality     | City search, address enrichment, mandatory restaurant/place selection, selected-place position patching, and map live-update camera stability have landed; remaining work is real-world testing rather than issue 902 implementation. | Discovery, search, restaurant context, and trust depend on usable location data.   |
| Currency quality     | Issue 909 now prefills currency from Bite location and issue 967 warns about suspicious prices; issue 978 tracks fallback, manual override, and travel/border edge-case proof.                                                        | Prices should make sense for the place where a Bite was created or experienced.    |
| Bite photo upload    | [[issue-927]]: production can create a Bite document while the intended photo upload does not complete.                                                                                                                               | Bite creation is core to launch; missing photos make successful posts look broken. |
| Edge cases           | Vacation usage, posting later, and missing location need explicit testing.                                                                                                                                                            | Real users will create Bites outside the ideal happy path.                         |
| Notifications        | Issue 971 added daily ranking-change notifications; delivery still needs device verification.                                                                                                                                         | Launch learning and retention signals depend on reliable notifications.            |
| Analytics            | Events need to be defined, implemented, and verified.                                                                                                                                                                                 | Launch learning depends on reliable usage data.                                    |
| Production readiness | Playwright login, registration, and create-Bite coverage now exists through issue 983, but Android, iOS, web, and CI reliability testing remain before release candidate.                                                             | Public launch requires confidence across supported platforms.                      |
| Store assets         | App Store and Google Play assets need preparation.                                                                                                                                                                                    | Publishing cannot complete without store-ready material.                           |

## Developer Experience Issues

- Local Playwright runs are flaky. `nxE2EPreset` only pins `workers: 1` when `CI` is set, so a local `npm run e2e` runs every spec in parallel against one Firebase emulator and the same seeded users. CI is unaffected. Run `npx nx e2e bite-tribe-e2e --workers=1` for a trustworthy local result; see [[Implementation - Testing]].
- `npx nx lint bite-tribe-firebase` reports several hundred phantom problems. The project defines no lint target, so Nx infers one that lints the gitignored `functions/lib` build output with the root config. The project's real lint is `npm run lint` inside `apps/bite-tribe-firebase/functions`, which is clean. Wiring the inferred target into CI would fail immediately.
- Nx commands can start silently or stall while constructing the project graph, even with the daemon disabled. The installed tree currently mixes the workspace's Nx 22 toolchain with older Nx/Devkit copies loaded by `@nxext/capacitor@21` and `nx-loki`; this is a credible risk but not a proven single cause. Follow [[Current State - Nx And Dependency Migration Roadmap]].
- `apps/bite-tribe-business-e2e` is a legacy Cypress surface while Playwright is the selected E2E architecture. Preserve any unique scenarios in Playwright, then remove the Cypress project rather than migrating its Nx executor.
- Visual regression still runs through the stale `nx-loki` adapter. The selected target state is direct `oblador/loki` CLI usage with the existing reference-image review workflow preserved.

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
- [[Current State - Nx And Dependency Migration Roadmap]]
