# Current State - Roadmap

- ## Purpose

  This roadmap describes the launch path starting from 26 June 2026.

  The target is a public launch in roughly 6 to 8 weeks, with enough time to finish launch-critical technical work without endlessly polishing.

- ## Phase 1 - Launch Preparation

  Dates: 26 June 2026 to 17 July 2026.

- ### Week 1

  Focus: Firebase App Check.

- Monitor verified request ratio.
- Fix remaining App Check issues.
- Enable enforcement.
- ### Week 2

  Focus: Location and currency quality.

- Enrich Bite location using Google Places.
- Validate currency against location.
- Test edge cases:
  - vacation usage
  - posting later
  - missing location
- ### Milestone

  All launch-blocking backend work completed.

- ## Phase 2 - Product Intelligence

  Dates: 20 July 2026 to 31 July 2026.

- ### Week 3

  Focus: Analytics.

- Define events.
- Implement Firebase Analytics.
- Verify events in DebugView.
- Build a dashboard with key metrics.
- ### Week 4

  Focus: Production readiness.

- Android testing.
- iOS testing.
- Web testing.
- Fix remaining launch blockers.
- Prepare App Store and Google Play assets.
- ### Milestone

  Release Candidate ready.

- ## Phase 3 - Public Launch

  Dates: 3 August 2026 to 16 August 2026.

- ### Week 5

  Focus: Soft launch.

- Publish the app.
- Announce to existing testers.
- Invite already-contacted influencers.
- Monitor Crashlytics and Analytics daily.
- ### Week 6

  Focus: Public launch.

- Instagram posts.
- Reddit where appropriate.
- LinkedIn.
- Friends and family.
- Travel communities.
- ### Goal

  The first few hundred real users.

- ## Phase 4 - Learn

  Dates: August 2026 to September 2026.

  Focus: learn from real usage instead of adding major new features.

- Improve onboarding.
- Fix bugs.
- Improve retention.
- Watch analytics every day.
- Talk to users.
- ## Strategic Rule

  After launch, resist adding major new features until the product has enough real usage signals to show what people actually value.

- ## Related Pages
- [[Mission]]
- [[Current State - Known Issues]]
- [[Current State - Release State]]
- [[Architecture - Analytics]]
- [[Architecture - Firebase]]
