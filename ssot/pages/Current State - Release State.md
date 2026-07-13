# Current State - Release State

## Purpose

Release state summarizes where BiteTribe stands on the path to launch.

## Baseline

Roadmap baseline date: 26 June 2026.

Target launch window: 6 to 8 weeks from the baseline date.

Target public launch period: 3 August 2026 to 16 August 2026.

## Current Release Stage

BiteTribe is in launch preparation as of 12 July 2026.

The product is not yet in public launch mode. The current focus is proving the recently landed backend trust, location, currency, gamification, notification, and restaurant data-quality work in realistic testing before the release-candidate phase.

## Next Milestones

| Milestone                              | Target Date              | State   |
| -------------------------------------- | ------------------------ | ------- |
| Launch-blocking backend work completed | 17 July 2026             | Planned |
| Release Candidate ready                | 31 July 2026             | Planned |
| Soft launch                            | Week of 3 August 2026    | Planned |
| Public launch                          | Week of 10 August 2026   | Planned |
| Learning phase                         | August to September 2026 | Planned |

## Recent Completed Work

- Issue 967 added client-side suspicious price validation.
- Issue 909 / PR \#965 added location-based currency prefill for Bite creation.
- Issue 974 added city search through backend search functions and search UI wiring.
- Issue 966 added weekly Bite count resync for leaderboard/profile aggregate repair.
- Issue 968 persisted leaderboard ranking/contribution display behavior.
- Issue 971 added daily ranking-change notifications.
- Issue 975 added profile country badges and supporting country-code derivation.
- Issue 942 added Business app restaurant candidate verification into real Restaurants.
- Issue 943 / PR \#981 replaced direct Bite place text entry with required restaurant/place selection before saving.
- Issue 902 was closed as obsolete after issue 943 because selected places already patch the Bite position when a trusted place position is available.
- Issue 982 fixed map camera jumps when live Bite marker updates arrive.
- Issue 983 replaced the consumer E2E baseline with Playwright login, registration, and create-Bite coverage.

## Release Readiness Checklist

- Firebase App Check verified request ratio monitored.
- Remaining App Check issues fixed.
- App Check enforcement enabled.
- Bite location enriched with Google Places.
- City search backed by enriched Bite location data implemented.
- Location-based Bite currency prefill implemented.
- Client-side suspicious price validation implemented.
- Currency prefill fallback and manual override tested.
- Leaderboard aggregate resync implemented.
- Ranking-change notifications implemented and device-tested.
- Profile badges implemented.
- Restaurant candidate verification implemented and emulator-tested.
- Mandatory restaurant/place picker implemented for Bite creation.
- Map camera remains stable when new Bites arrive through live updates.
- Playwright E2E smoke coverage exists for login, registration, and create Bite.
- Edge cases tested:
  - vacation usage
  - posting later
  - missing location
- Firebase Analytics events defined.
- Firebase Analytics implemented.
- Analytics verified in DebugView.
- Key metrics dashboard created.
- Android testing completed.
- iOS testing completed.
- Web testing completed.
- Remaining launch blockers fixed.
- App Store assets prepared.
- Google Play assets prepared.
- Crashlytics and Analytics monitoring plan active for soft launch.

## Launch Rule

Before public launch, the release should be stable enough to learn from real users without confusing technical failures with product feedback.

## Related Pages

- [[Current State - Roadmap]]
- [[Current State - Known Issues]]
- [[Current State - Open Questions]]
- [[Implementation - Release And Build Workflow]]
