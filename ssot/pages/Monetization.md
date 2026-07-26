# Monetization

## Purpose

Monetization describes how BiteTribe earns money, which capabilities are sold, and which are deliberately free.

It exists as a product page rather than a feature description because the boundary between free and paid is a product decision that constrains discovery, search, the marketplace and the backend at the same time.

## Why It Exists

Monetization should help answer:

> What does BiteTribe give away, what does it sell, and why is that split fair to the user?

[[Vision]] promises an ecosystem where food creators can earn money from their local knowledge and where businesses benefit from authentic recommendations instead of traditional advertising. Monetization is how that promise becomes revenue without turning the product into the thing it set out to replace.

## Business Rules

- BiteTribe has three revenue channels: ads, subscriptions, and paid BiteTrails.
- There are two subscription tiers: Free and Pro.
- The free tier is exactly today's product. A free user loads the 15 km radius around their current position and can search and filter inside that result set.
- Pro sells reach beyond the user's physical surroundings. It is the natural price line because the capabilities beyond that radius are also the ones that cost money to run.
- Content creation is never gated. Creating, editing, liking, reviewing and saving Bites stay free, because supply is what makes discovery worth paying for.
- Map zoom is free for every user regardless of tier. See [[UC - Discover Bites]].
- Entitlement is server-owned. A billing webhook writes the entitlement, and gates are enforced in Cloud Functions and Firestore rules, never only in the UI.
- Ads are shown to free users only.
- The Market Place should expose curated experiences, not generic ads. Advertising and marketplace inventory stay separate surfaces.
- Paid BiteTrail revenue is shared with the creator on a net-proceeds basis, never on gross.

## The Three Channels

| Channel         | Who pays                                          | Rails                                                        | Epic          |
| --------------- | ------------------------------------------------- | ------------------------------------------------------------ | ------------- |
| Ads             | Advertisers, shown to free users                  | Google AdMob                                                 | [[epic-1123]] |
| Subscriptions   | Food lovers who want more than their surroundings | Apple and Google in-app purchase through RevenueCat          | [[epic-1124]] |
| Paid BiteTrails | Food lovers buying a curated journey              | Store in-app purchase, creator payout through Stripe Connect | [[epic-1125]] |

The shared entitlement foundation all three depend on is [[epic-1122]], and [[epic-1121]] is the umbrella.

## Free And Pro Capability Matrix

| Capability                                                                             | Free  | Pro    |
| -------------------------------------------------------------------------------------- | ----- | ------ |
| Home feed and map within 15 km of the current position                                 | Yes   | Yes    |
| Client-side search and filtering inside the loaded 15 km set                           | Yes   | Yes    |
| Map zoom and zoom gestures                                                             | Yes   | Yes    |
| Creating, editing, liking, reviewing and saving Bites                                  | Yes   | Yes    |
| Bucket lists and free BiteTrails                                                       | Yes   | Yes    |
| Backend search: `searchBites`, `searchBitesByCity`, `searchRestaurants`, `searchUsers` | No    | Yes    |
| Loading Bites at a position or city other than the current one                         | No    | Yes    |
| Radius beyond 15 km                                                                    | No    | Yes    |
| Ads                                                                                    | Shown | Hidden |

## Revenue Share For Paid BiteTrails

Paid BiteTrails sell through store in-app purchase. The creator receives 80 percent and BiteTribe 20 percent of net proceeds.

Net proceeds means the sale price minus the store commission. Worked example at a 30 percent store commission:

| Component        | Share of gross |
| ---------------- | -------------- |
| Store commission | 30 percent     |
| Creator          | 56 percent     |
| BiteTribe        | 14 percent     |

Gross-based wording is forbidden. 80 percent of gross plus a store commission exceeds the sale price and cannot be honoured. Creator terms, the publish flow, the earnings dashboard and any marketing copy must all say net proceeds.

## Relationships

```text
Monetization
|-- Subscription (entitlement)
|-- User (tier display, account identity)
|-- Bite Trail (paid trails, creator earnings)
|-- Market Place (paid listings, purchase)
|-- Bite (discovery capabilities being sold)
```

## Permissions

- Free user
  - Full creation and social capability.
  - Discovery limited to the 15 km radius around the current position.
  - Sees ads.
- Pro user
  - Everything a free user can do.
  - Backend search, remote positions and cities, a larger radius, and no ads.
- Creator or organisation
  - Can publish paid BiteTrails once identity verification, payout onboarding and creator terms are complete.
- Admin
  - Can grant or revoke an entitlement for support cases, with an audit trail.

## Current Limitations

- Nothing in this page is implemented yet. All of it is Priority P1 and post-launch.
- `subscriptionTier` exists on the public user document but is not enforced anywhere, and `createUserOnAuthCreate` currently writes tier 1 for every new account.
- `firestore.rules` still allows every authenticated user to write every document, so no gate is trustworthy until [[epic-1122]] and issue \#1078 land.
- There is no ad, purchase or payout dependency in the workspace.
- Free-tier position enforcement is best-effort. A client can report any coordinates, so the radius gate resists casual bypass rather than a determined one.

## Out Of Scope

- A creator or business subscription tier. Business-side monetization stays with [[epic-735]].
- Restaurant transaction fees or commission on table orders. That belongs to [[epic-1073]].
- Web and PWA billing. AdMob has no web SDK and store in-app purchase does not apply on web, so the PWA stays free and ad-free until a separate decision is taken.

## Related Epics

- [[epic-1121]] umbrella
- [[epic-1122]] entitlement foundation and Pro gating
- [[epic-1123]] AdMob advertising
- [[epic-1124]] Pro subscriptions
- [[epic-1125]] paid BiteTrails and creator revenue share

## Sources Used

- [[Vision]]
- [[Mission]]
- [[Principles]]
- [[Glossary]]
- [[Personas]]
- [[Subscription]]
- [[Bite Trail]]
- [[Market Place]]
- [[User]]
