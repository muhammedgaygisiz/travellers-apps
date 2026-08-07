# Current State - E2E Coverage

## Purpose

This page tracks Playwright end-to-end coverage across Bite Tribe use cases so
future work can resume from the last verified state. It covers both suites:
`apps/bite-tribe-e2e` for the consumer app and `apps/bite-tribe-business-e2e`
for the business app.

The status describes E2E coverage, not whether the product use case is
implemented. Keep coverage conservative: use ✅ only when the representative
journey is covered, 🟡 when only part of the journey is covered, and ⬜ when no
representative E2E journey exists.

The baseline column was synchronized with
[PR #1058](https://github.com/muhammedgaygisiz/travellers-apps/pull/1058). The
current column also reflects the coverage added after it, so update this page in
the same change that adds or removes a Playwright journey.

## Coverage Overview

Legend: ✅ covered · 🟡 partially covered · ⬜ not covered

| Use case                                                        | Before PR #1058 | Current | Current E2E evidence or remaining gap                                                                                                                                                                                                                                                                                                                                                         |
| --------------------------------------------------------------- | :-------------: | :-----: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [[UC - Guide New Users After Registration]]                     |       ✅        |   ✅    | Registration, login, onboarding, and continuation to the home page                                                                                                                                                                                                                                                                                                                            |
| [[UC - Create And Maintain Personal Bites]]                     |       🟡        |   ✅    | Rich Bite creation, image, tags, rating, description, price/currency, restaurant selection, persistence, details verification, editing, photo upload status including the failed state and both retry flows, and posting several Bites in one sitting through "Post and add another Bite"                                                                                                     |
| [[UC - Strengthen Location Currency And Data Quality Guidance]] |       ⬜        |   ✅    | Currency lookup from position, preferred-currency fallback, manual override, invalid-price recovery, and persisted values                                                                                                                                                                                                                                                                     |
| [[UC - Inspect Bite Details]]                                   |       ⬜        |   ✅    | Contextual details, sharing, directions, reviews, bucket-list action, creator-profile navigation, the failed header photo with its retry, and the cold shared-link entry for both a signed-in and a signed-out recipient                                                                                                                                                                      |
| [[UC - Discover Bites]]                                         |       🟡        |   ✅    | Nearby feed, date sorting, map view, free-user zoom, marker selection, Bite drawer, and feed reactions with their aggregated count                                                                                                                                                                                                                                                            |
| [[UC - Search In BiteTribe]]                                    |       ✅        |   ✅    | Bite and restaurant-category search                                                                                                                                                                                                                                                                                                                                                           |
| [[UC - Manage Profile And Social Graph]]                        |       ⬜        |   ✅    | Profile editing, public-profile navigation, followers/following lists, follow/unfollow state, counts, and Firestore relationships                                                                                                                                                                                                                                                             |
| [[UC - Browse Restaurants And Places]]                          |       ⬜        |   ✅    | Restaurant search and empty states, verified restaurant context, unverified place context, associated Bites, and Bite navigation                                                                                                                                                                                                                                                              |
| [[UC - Save And Rate BiteTrails Through Bucket Lists]]          |       ⬜        |   ✅    | Adding from Bite details, creating the first list inline from a Bite on an account that owns none, claiming a free BiteTrail into a Bucket List with its sell record, the saved-trail return state, ticking a Bite off and undoing it, and the one-time BiteTrail rating with its read-only state                                                                                             |
| [[UC - Discover BiteTrails In The Marketplace]]                 |       ⬜        |   ✅    | Market place listing with owner, location, Bite count, and free-trail pricing, plus navigation into the trail's Bites                                                                                                                                                                                                                                                                         |
| [[UC - View Restaurant Menus]]                                  |       ⬜        |   🟡    | A Restaurant's menu opened from its page, and Bite creation from a menu item: the prefilled dish, Restaurant, and price, a cancelled draft that the next creation session does not inherit, a menu-derived Bite posted and read back, and its Restaurant carried into the further Bites of an "add another" session. Menu editing and the dynamic menu fallback stay uncovered                |
| [[UC - Use Gamification Signals]]                               |       ⬜        |   🟡    | Leaderboard ranking order, per-user Bite counts, navigation into a ranked profile, and the empty state; the Bite-triggered rebuild and the daily ranking notification stay on the functions unit tests                                                                                                                                                                                        |
| [[UC - Configure Personal Settings]]                            |       ⬜        |   ✅    | Account-type display, save gating on a pristine form, preferred-currency and favorite-currency pickers, theme choice, the persisted document including the carried-through location grant, and the values read back                                                                                                                                                                           |
| [[UC - Use Account And Legal Flows]]                            |       ⬜        |   ✅    | Email verification prompt and resend offer on settings; in-app privacy-policy navigation and its translated heading; delete-account contract, the signed-in account named on the page and repeated in the final confirmation, cancellation safety, completed profile/settings deletion, and Bite anonymization. The resend call itself needs Workspace mail secrets the emulator has none for |
| [[UC - Use Local Gallery Support]]                              |       ⬜        |   ⬜    | No representative E2E journey                                                                                                                                                                                                                                                                                                                                                                 |
| [[UC - Receive App Notifications And Engagement Updates]]       |       ⬜        |   ⬜    | No representative E2E journey                                                                                                                                                                                                                                                                                                                                                                 |
| [[UC - Maintain Restaurants In The Business App]]               |       ⬜        |   🟡    | Business login, the dashboard restaurants list, opening a Restaurant, and persisting its About text and address. The restaurant-candidate verification flow, menu editing, and new-restaurant creation stay uncovered                                                                                                                                                                         |
| [[UC - Create And Operate BiteTrails In The Business App]]      |       ⬜        |   ⬜    | No representative E2E journey                                                                                                                                                                                                                                                                                                                                                                 |
| [[UC - Run Operational Migrations]]                             |       ⬜        |   ⬜    | No representative E2E journey                                                                                                                                                                                                                                                                                                                                                                 |

## Picking Up Future Work

- Start with a 🟡 journey when completing an existing partial flow is the
  priority.
- Otherwise choose an ⬜ journey based on the current product and release
  priorities.
- Read the linked use-case page before defining the next scenario.
- Add or update Playwright coverage under `apps/bite-tribe-e2e` for consumer
  journeys and `apps/bite-tribe-business-e2e` for business-app journeys.
- Run emulator-backed E2E tests serially as described in
  [[Implementation - Testing]].
- A journey whose precondition is what an account does _not_ own cannot use the
  shared `default` test user, since other specs seed onto it. Use the isolated
  `fresh` user in `apps/bite-tribe-e2e/src/support/test-users.ts` and clear the
  documents the journey depends on, because the emulator keeps every write for
  the whole run.
- Update this table and the linked use-case evidence when coverage changes.

## Related Pages

- [[Architecture - Testing]]
- [[Implementation - Testing]]
- [[Current State - Roadmap]]
- [[Current State - Known Issues]]
