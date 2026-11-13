# Current State - Roadmap

**Last verified:** 2026-11-13

## Purpose

This roadmap describes the shape of the launch path that started on 26 June 2026: four phases, what each was for, and the rule that governs the phase BiteTribe is in now.

It holds no dated status. Where each milestone stands, the original and revised targets, and the reasoning behind every slip are in [Current State - Release State](release-state.md).

## Phase 1 - Launch Preparation

Done. Finish the launch-blocking backend work: Firebase App Check monitoring, fixes and enforcement, and the location and currency quality of a Bite - Google Places enrichment, currency prefill from the Bite's location, and the vacation, posting-later and missing-location edge cases.

## Phase 2 - Product Intelligence

Done. Make the release measurable and ready to ship: the analytics event taxonomy and its dashboard ([Implementation - Analytics Events](../implementation/analytics-events.md)), the platform test pass on Android, iOS and web, the store assets, and the onboarding assistant ([epic-850](../history/records/epic-850.md)).

The Nx and dependency migration ran alongside it without becoming a launch prerequisite; its own state is in [Current State - Nx And Dependency Migration Roadmap](nx-and-dependency-migration-roadmap.md).

## Phase 3 - Public Launch

Done. Soft launch on both stores, then the public launch campaign ([#913]).

## Phase 4 - Learn

Current. Learn from real usage instead of adding major new features.

- Improve onboarding.
- Fix bugs.
- Improve retention.
- Watch analytics every day.
- Talk to users.

Work that brings people to the app, rather than adding to it, belongs here: the city landing pages of [#1487] are an example, described in [UC - Find BiteTribe Through A City Landing Page](../use-cases/uc-find-bitetribe-through-a-city-landing-page.md).

### Monetization preparation

[Monetization](../product/monetization.md) is Priority P1 and post-launch. [epic-1121][#1121] is the umbrella over four stage epics covering the entitlement foundation ([epic-1122][#1122]), AdMob advertising, Pro subscriptions, and paid BiteTrails.

- It is prepared during this phase rather than after it, because store products and review, RevenueCat setup, the consent flow, and creator payout onboarding all have lead time that cannot be compressed once the decision to monetize is made.
- The ads channel can start first. It needs no purchase rails, no store products and no payout infrastructure, and only its "hide ads for Pro" child depends on the entitlement work.

## Strategic Rule

After launch, resist adding major new features until the product has enough real usage signals to show what people actually value.

## Related Pages

- [Mission](../product/mission.md)
- [Current State - Known Issues](known-issues.md)
- [Current State - Release State](release-state.md)
- [Current State - Nx And Dependency Migration Roadmap](nx-and-dependency-migration-roadmap.md)
- [Architecture - Analytics](../architecture/analytics.md)
- [Architecture - Firebase](../architecture/firebase.md)

[#913]: https://github.com/muhammedgaygisiz/travellers-apps/issues/913
[#1121]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1121
[#1122]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1122
[#1487]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1487
