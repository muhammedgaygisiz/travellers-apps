# Current State - Open Questions

## Purpose

Open questions capture decisions that should become clear before or shortly after launch.

## Product Questions

- What onboarding steps most reliably lead a new user to create or save their first Bite?
- Which discovery entry point matters most for early users: feed, map, search, restaurant, profile, or BiteTrail?
- Which Bite quality signals should be required before launch, and which can be learned after launch?
- How should vacation usage and posting later be represented in the product?
- How much restaurant and menu context is needed for launch without drifting away from the dish-first product decision?
- Can a maintainer put their own tags on a restaurant? Nothing of the kind exists: there is no tag field on `Restaurant` and nothing in the business app writes one. The tags both restaurant pages already render are derived from Bites and belong to [[UC - Browse Restaurants And Places]]; a maintainer-set tag would be the restaurant describing itself rather than its diners describing it. It was the last idea left on the use case that carried "restaurant profile completeness", and it is recorded here because that page was deleted rather than because the idea was dropped. If it is wanted it needs an owning use case and a field; if not, nothing in the SSOT should describe it.
- What are the brand characters called, and what does a surface use one for? The seven committed in [issue 1482](https://github.com/muhammedgaygisiz/travellers-apps/issues/1482) carry the design export's filenames, which mix a historical term with national ones, and nothing in the product references them. Both halves are open: the vocabulary, and whether a character becomes an avatar, a BiteTrail marker, an empty state, or stays brand material. See [[Implementation - Brand Characters]].
- Which palette is the brand's, the logo's or the new characters'? The shipped `logo.svg` outlines a `#F0B967` cookie in `#55422A`; the seven characters use `#402810` over `#F8B850`. They read as one family at thumbnail size and as two drafts side by side, which the `Brand/Characters` Storybook page shows. Re-cutting the logo changes a mark that is already in both stores, so this is a decision rather than a cleanup.

## Glossary And Naming Questions

- Is the reaction on a Bite called a **Like** or a **Reaction**? Both wordings are permitted in [[Glossary]] until this is decided. The concept is one reaction per user and Bite, chosen from three emoji, where choosing another replaces the previous one. The app's own onboarding copy already says "reactions"; the model, its fields and its counters say `likes`. Deciding late costs a rename of the user-facing copy **or** of the data model, and deciding it now costs neither.

## Restaurant Interaction Platform Questions

Post-launch. These belong to issue \#735 and its stage epics. Each blocks the stage named next to it, and the proposals recorded on the epics are proposals, not decisions.

Ownership, stage 0, issue \#1069:

- What does an operator record as the reason for a restaurant ownership assignment, and what evidence backs it? There is no approval step to gate: \#1076 declined the self-service claim and the decision is settled off-system. Both `assignRestaurantOwner` and `revokeRestaurantOwner` require a reason and Cloud Logging is the only record they leave, so the reason _is_ the audit trail. See [[UC - Own And Claim Restaurants]].
- What happens to a restaurant's Bites and menu when ownership changes or is revoked?

Table management, stage 2, issue \#1071:

- Must staff confirm table occupancy, or can a guest scan occupy a table automatically? **Settled 13 September 2026 by `RD-TS-1`:** staff confirm, and a guest scan raises a pending signal instead of occupying anything. `RD-TS-2` adds that confirming _is_ the seating rather than a second action a host has to remember. Delivered by issue \#1101.
- Can guests choose a table themselves? **Partly settled by `RD-TS-1`:** a guest picks the table they are sitting at, by scanning the code glued to it, and that choice is a request rather than a booking. Whether staff can be asked for a _different_ table from the app is untouched and unowned.
- When is a table considered available again? Unchanged: a visit ends into `cleaning` and somebody has to look at the table. `RD-TS-5` settles the neighbouring question of when a **session** ends, which is not the same thing - a table with no live sessions is not thereby free.
- Who can close or reopen a visit? **Half settled.** Closing stays staff's: `leaveTableSession` ends one guest's session and deliberately touches neither the visit nor the table, because a guest who could end a visit could clear a table they were never sitting at. Reopening remains impossible by design - ending is one-way. Which staff may close is still open.

QR ordering, stage 3, issue \#1072:

- Can multiple guests join the same table session? **Settled 13 September 2026 by `RD-TS-3`:** yes, and by construction rather than by a check - the join follows the one pointer at an open visit. Delivered by issue \#1101.
- Is an order shared by the table or separated by guest? **Settled 13 September 2026 by `RD-TS-9`, delivered by issue \#1103, and extended to the reading side by `RD-TS-12` on issue \#1104 - a guest's screen lists the orders their own phone sent and totals those, while the bill stays the party's and is settled at the table:** the _visit_ is shared and an _order_ belongs to one phone. One `TableOrder` per submission carries the `guestUserId` and `sessionId` that sent it, so the party shares a bill and the kitchen still gets a ticket per phone. Per-line attribution was refused, because a cart row merges repeated taps and un-merging it would give a round of the same beer one line per person.
- Can guests order without a BiteTribe account? **Settled 13 September 2026 by `RD-TS-4`:** yes, through anonymous authentication, upgradeable in place. An anonymous account is deliberately not a member: it writes no `/users` document and does not pass the route guards.
- How are duplicate or fraudulent scans handled? **Partly settled.** A duplicate scan is now harmless rather than handled: the session document is named for the table and the guest, so one phone scanning one code twice addresses one document. The rate limit stays the per-instance one of issue \#1100, and a durable limit is still issue \#1107's.
- Can a QR code be used from outside the restaurant, and does that matter? **Settled 13 September 2026 by `RD-TS-1`:** it can, and it is bounded rather than prevented. A remote scan produces a pending session that cannot order and leaves the table's live state untouched, so what it costs the restaurant is one row on a screen.
- When does a table session expire? **Settled 13 September 2026 by `RD-TS-5`:** on visit close, or after `sessionIdleTimeoutMinutes`, defaulting to two hours. Expiry is a predicate the next reader persists rather than a scheduled sweep.
- How are table changes handled after ordering has started? Still open for the guest-facing half, sharper since issue \#1104, and now open on the staff side too: issue \#1105's queue groups by `TableOrder.tableId`, which is the table on the ticket and is what the kitchen asks for, so an order placed before a move stays under the old number while the party sits somewhere else - right for the pass and wrong for the waiter carrying the plates. The backend half holds: `syncTableSessions` finds a visit's sessions by `visitId` rather than by table, so a party moved by `moveTableVisit` keeps its guests, and the guest's order listener follows the visit rather than the table - so a moved party goes on seeing its orders. What is wrong is the heading above them: the screen names the table off the scan, and a guest walked to another table reads their old table number on their own phone for the rest of the meal. Still unowned.
- How are unavailable menu items communicated? **Settled.** Issue \#1100 answered the scan - a menu whose every dish is off resolves to `menuUnavailable` rather than to an empty screen. Issue \#1102 marked individual items in the browsing surface. Issue \#1103 closed the last gap: an unavailable dish keeps a visible row with a **disabled** add button rather than disappearing, because a dish that vanishes when the kitchen runs out reads as a menu that changed, and the cart and the backend both refuse it by name if a second entry point gets past the button.
- How are cancelled or incorrect orders corrected? **Settled 13 September 2026 by `RD-TS-16`, delivered by issue \#1105.** A correction is a staff-side cancellation carrying a reason, and the reason is **required** rather than merely possible: the queue asks for a sentence before it sends, `transitionTableOrderStatus` refuses a `cancelled` without one, and it refuses a reason on any other status - a reason attached to a served dish would be a second, contradictory account of what happened to it. Who may do it is whoever may operate the restaurant during service: the owner, an operator, and an account associated with that one restaurant, through the same `requireTableStateAuthority` a table transition uses. What is still not possible is editing an order, and deliberately - a bill that can be rewritten after the fact is a bill nobody can dispute.
- How are restaurant staff notified about new orders? **Settled 13 September 2026 by issue \#1105**, as [[epic-1072]] proposed: an in-app queue plus a push, reusing the existing notification infrastructure. `notifyStaffOnNewTableOrder` fires on the order's **create** and on nothing else, resolves the owner and every account associated with the restaurant - the same two reads that decide who may act on it - and goes out through `sendLocalizedNotification`, so an installation with notifications turned off stays off and everybody is written to in their own language. It collapses per restaurant and table. What the settlement does **not** reach is delivery: the business app runs in a browser and `@capacitor/push-notifications` registers no token there, so a push arrives only on an installation of the consumer app signed into the same account. The queue's own listener and its per-device alert are what a tablet at the pass actually hears. Making the business app installable is unowned and belongs to whichever issue decides a staff account needs a phone.
- **How does a guest ask for a waiter, and how is that rate limited? Settled 13 September 2026 by `RD-TS-18`, `RD-TS-20` and `RD-TS-21`, delivered by issue \#1106.** Two kinds, `callStaff` and `requestBill`, one document per table per kind at a **derived** name - so a repeated tap addresses the signal that is already up, across phones as well as across taps, and "repeated taps do not create repeated signals" is a property of the address rather than of a check. The clock is the other half: a signal raised within a minute of the last one of that kind at that table is refused with the moment it may be asked for again, measured from when it was raised rather than from when it was answered so a restaurant is not punished for being quick. Asking for the bill also writes `awaitingPayment`, which closes the table's ordering. What this does **not** reach is a guest who has not been seated: a `pending` session is refused, because making that visible to the floor is issue \#1107's and two rows for one person waiting at the door is worse than one.
- **Where does a restaurant turn table ordering on? Settled 13 September 2026 by issue \#1102: the restaurant profile page.** It carries two modes and not three - `enabled` is one boolean, and a scan with it off shows the menu either way, so "no table QR" is the absence of a floor plan rather than a setting. The `timeZone` is chosen there too, because the opening hours above it are read in it. **The staff-side pause is still unowned**, and is deliberately not on that page: it is an action during service rather than owner configuration, and the save carries an existing pause through untouched rather than clearing it. `sessionIdleTimeoutMinutes` (issue \#1101) is also still unwritten, so every restaurant uses the two-hour default.
- **What should a scan at a menu-only restaurant do? Settled 13 September 2026 by `RD-TS-6`, delivered by issue \#1102.** It shows the way to the menu. `tableOrderingDisabled` and `orderingPaused` left the refusal list and became an ordering verdict on a scan that resolved; `restaurantClosed` stayed a refusal, because it is a statement about the restaurant rather than about ordering.
- **Where do staff see a pending table session?** Issue \#1101 writes the signal and `firestore.rules` admits every reader of the floor plan to it, so the data is there and queryable. Nothing renders it yet. **Issue \#1107 owns it**, which [[epic-1072]] states directly - its proposal for duplicate and fraudulent scans is "rate limit per token and per device, plus staff visibility of pending sessions" - and \#1107's scope carries "anomaly signals surfaced to the restaurant: many sessions on one table, sessions outside opening hours, sessions on a disabled table". What \#1107 does **not** name is the ordinary case: table 12 has two guests waiting and nothing about it is anomalous. Whether that row belongs in \#1107 beside the anomalies, or in the live table view \#1093 built and closed, is the open part. Until one of them draws it, `RD-TS-1`'s "one row on a screen in the restaurant" is a row no screen draws.
- **Is staff confirmation mandatory or configurable?** `RD-TS-1` made it unconditional: a scan at an unseated table is always `pending`. Issue \#1107's scope says "optional staff confirmation requirement before a session can order, **configurable per restaurant**", which assumes the opposite default - that a session may order without confirmation unless a restaurant asks otherwise. One of the two has to give. The decision stands as written until then, because it is the safe direction: a restaurant can be given a way to relax it later, and a session that ordered without confirmation cannot be un-ordered.

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

## Public Content Questions

These belong to [[epic-1487]], the city landing pages. Each gates the first published page rather than the first commit, and two of them are not engineering questions.

- May a member's Bite photo appear on a public marketing page? In-app display to signed-in members is a different use, and the terms and the privacy policy have to permit the public one. The epic's proposal is that the first pages use restaurant-supplied and operator-supplied imagery only. Google Places photos are not implicated: `get-place-details` keeps `photos` out of its field mask.
- Does an editorial page published under the company name need an Impressum? The public surface today is support, privacy and account deletion, none of which is editorial. Answer before a page is public, not after.
- What is the content bar for publishing a page? One production restaurant has a menu. A curated list whose entries have no dishes behind them is the thin-page pattern that costs a domain more than it earns, so the epic proposes a stated minimum of real Bites with photos per entry, and one city in the first release.
- Does the URL space keep `/eat/<city>/<slug>`? Cheap to change before the first page is indexed and expensive after.

## Related Pages

- [[Current State - Roadmap]]
- [[Current State - Known Issues]]
- [[Current State - Release State]]
- [[ADR-0001 Dish First Product]]
