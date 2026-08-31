# Current State - Open Questions

## Purpose

Open questions capture decisions that should become clear before or shortly after launch.

## Product Questions

- What onboarding steps most reliably lead a new user to create or save their first Bite?
- Which discovery entry point matters most for early users: feed, map, search, restaurant, profile, or BiteTrail?
- Which Bite quality signals should be required before launch, and which can be learned after launch?
- How should vacation usage and posting later be represented in the product?
- How much restaurant and menu context is needed for launch without drifting away from the dish-first product decision?

## Restaurant Interaction Platform Questions

Post-launch. These belong to issue \#735 and its stage epics. Each blocks the stage named next to it, and the proposals recorded on the epics are proposals, not decisions.

Ownership, stage 0, issue \#1069:

- What evidence is required before a restaurant claim is approved?
- What happens to a restaurant's Bites and menu when ownership changes or is revoked?

Table management, stage 2, issue \#1071:

- Must staff confirm table occupancy, or can a guest scan occupy a table automatically?
- Can guests choose a table themselves?
- When is a table considered available again?
- Who can close or reopen a visit?

QR ordering, stage 3, issue \#1072:

- Can multiple guests join the same table session?
- Is an order shared by the table or separated by guest?
- Can guests order without a BiteTribe account?
- How are duplicate or fraudulent scans handled?
- Can a QR code be used from outside the restaurant, and does that matter?
- When does a table session expire?
- How are table changes handled after ordering has started?
- How are unavailable menu items communicated?
- How are cancelled or incorrect orders corrected?
- How are restaurant staff notified about new orders?

Payment and Bites, stage 4, issue \#1073:

- Does BiteTribe hold or route funds, or is payment always settled by the restaurant?
- Which market is first, and what receipt and fiscalisation rules apply there?
- Can a guest create a Bite from an order without a BiteTribe account?
- Are prices from a real order trusted without the suspicious-price validation from issue \#967?

## Monetization Questions

Post-launch. These belong to issue \#1121 and its stage epics. The proposals recorded on the epics are proposals, not decisions.

Entitlement foundation, stage 0, issue \#1122:

- What happens to existing accounts that currently carry `subscriptionTier: 1`? Treat them as Free at cutover, or grandfather them as a launch thank-you?
- Should a free user see a locked preview of Pro results, or nothing at all?
- How is a free user's "current position" established, given that a client can report any coordinates?

Advertising, stage 1, issue \#1123:

- What ad frequency? Issue \#542 proposes every 5 bites, the epic proposes every 8th card.
- One consent prompt covering analytics and ads, or two? This has to be settled with issue \#989.
- Which ad content categories must be excluded for a food product with dietary, religious and health sensitivities?

Subscriptions, stage 2, issue \#1124:

- What price point and which billing periods?
- Is there a free trial or introductory offer, and does it apply per store or per account?
- Does the PWA ever monetize, or does it stay a shop window for the native apps?

Paid BiteTrails, stage 3, issue \#1125:

- Are price points free-form or restricted to store price tiers?
- What is the minimum payout threshold and payout schedule for creators?
- Does a purchased BiteTrail stay accessible after a refund, and what happens to a Bucket List created from it?
- Who is liable for VAT per launch market? Under store in-app purchase the store is usually the merchant of record, and that must be confirmed rather than assumed.

## Review Thread Questions

These belong to issue \#1283 and do not block its implementation. Each has a working answer in the spec; they are recorded because the answer was chosen rather than derived.

- Should threads collapse only above two replies, as specified, or should every thread render collapsed by default for a uniform list?
- When replying to a reply, should the `@name` mention be stored as part of the review text, or only prefilled in the composer so the author can delete it before sending?
- Does a Bite document need a reply or thread count for the feed card, or is the count only ever derived on the details page?

Moderation questions raised by threading are recorded on [[epic-1284]], not here.

## Analytics Questions

- Which events define activation?
- Which events define retention?
- Which events show whether users understand Bite creation?
- Which dashboard metrics are needed for the first two launch weeks?
- What threshold should trigger a launch rollback, hotfix, or onboarding change? **Decided on 31 August 2026: no threshold is set in advance.** The call is made on the day, from the experience the soft launch produces, rather than from a number chosen before anyone has seen the product meet real users. What makes that workable is that the daily digest on [#991](https://github.com/muhammedgaygisiz/travellers-apps/issues/991) now carries stability as well as growth, so the judgement is made against numbers that arrive on their own: crash-free users alerting below 99%, unhandled errors alerting on a doubling. Those are alert thresholds, not rollback thresholds, and the distinction is deliberate - they say look, not act. Revisit once there is enough history to know what a bad day actually looks like.

## Release Questions

- What verified request ratio is acceptable before enabling App Check enforcement? **Settled.** The question never became a gate: server-side enforcement has been active for Firestore, Storage and Authentication since before Run 4, and Places API (New) stays in Monitoring by decision under [#1245](https://github.com/muhammedgaygisiz/travellers-apps/issues/1245). See [[Current State - Release State]].
- Which Android and iOS devices are required for launch testing? **Settled** by the charter: a physical Samsung SM-A566B on Android 16 and an iPhone 12 mini on iOS 26.6, plus web. See [[Current State - Release Candidate Test Charter]].
- What store screenshots and copy are needed for App Store and Google Play? **Settled** per slot in [[Implementation - Store Listing Assets]], including which gaps are accepted rather than filled.
- Who is included in the soft launch tester group? **Decided on 31 August 2026: the current users.** No separate cohort is assembled. Growth from there is expected to come through them telling friends and family, which is the point rather than a limitation - the soft launch is meant to grow but not fast, so that a defect reaches a handful of people instead of a few hundred. The property counted 40 active users over the seven days to 31 August 2026, which is the order of magnitude this starts from.
- Which communities should be contacted during public launch, and in what order?
- How are soft-launch testers told the app is live? **Decided on 31 August 2026: directly, by the maintainer.** No push campaign, no mailing list, no in-app announcement. The group is small enough that a personal message is both possible and better, and it avoids building an announcement channel for an audience of forty.
- Who are the soft-launch influencers? **Decided on 31 August 2026: there are none.** No influencer was successfully recruited, so the influencer half of [issue 912](https://github.com/muhammedgaygisiz/travellers-apps/issues/912)'s acceptance criterion is dropped from the soft launch rather than left blocking it. Recruiting is future work and belongs with the public launch campaign, [issue 913](https://github.com/muhammedgaygisiz/travellers-apps/issues/913).

## Related Pages

- [[Current State - Roadmap]]
- [[Current State - Known Issues]]
- [[Current State - Release State]]
- [[ADR-0001 Dish First Product]]
