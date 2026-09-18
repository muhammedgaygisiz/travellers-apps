# UC - Subscribe To BiteTribe Pro

## Status

**Level:** L1

Next to implement. Priority P1, post-launch. Nothing of the paid half exists: there is no
paywall, no store client, no billing webhook and no gated capability. What exists is the
display side and a deliberate note that it is only that - `subscriptionTier` on the public
user document is read by the settings page and the profile badge and by nothing else, and
both `libs/common/utils/src/lib/subscription-tier.ts` and its Functions twin say in their own
comments that it "is a display mirror, not an entitlement". `firestore.rules` treats it as
backend-owned so an account cannot grant itself Pro, and issue [#1127] stopped new accounts
being created at tier 1. The 15 km the Goal sells past is real but is a feed constant rather
than a gate.

## Goal

A food lover who has outgrown their immediate surroundings can pay for BiteTribe Pro and immediately get discovery beyond the 15 km radius they are standing in.

This page owns the purchase and what it turns on: the paywall, the store transaction, the
server-owned entitlement the webhook writes, and the moment a gated capability opens. Which
capabilities are sold, and why that split is fair, is [Monetization](../product/monetization.md); the entitlement record
and the Free/Pro capability matrix are issues [#1122] and [#1126]; the ads a Pro subscriber
stops seeing are [UC - See Ads As A Free User](uc-see-ads-as-a-free-user.md); and a one-off purchase of a curated trail,
which reuses these rails without being a subscription, is [UC - Buy A Paid BiteTrail](uc-buy-a-paid-bitetrail.md).

## Actors

- **Bite Creator** - acts: reaches a Pro capability, buys the subscription, and afterwards
  reads what it opened. Free and Pro are not two roles. `BITE_TRIBE_ROLES` holds only `admin`,
  `business` and `staff`, and the tier is an entitlement on the user document; issue [#1126]
  will make it a claim, which is still an entitlement rather than a role.

## Flow

- User reaches a Pro capability: a backend search, a city they are not standing in, or a radius beyond 15 km.
- The backend refuses the request with a gating error rather than failing generically.
- The app opens the paywall with copy naming the capability the user just reached.
- User selects a package and purchases through the store.
- The billing webhook verifies the purchase and writes the server-owned entitlement.
- The auth token refreshes and Pro capabilities become available without an app restart.
- Ads disappear.
- Subscription state, renewal date and cancellation route are visible in settings.

## Boundary Conditions

- A purchase reported by the client never grants access on its own.
- Restoring purchases returns the entitlement on a reinstall or a second device.
- A cancelled subscription keeps access until the end of the paid period; a refund revokes it immediately.
- A lapse forces a token refresh so access does not survive on a stale token.
- Free users keep full creation, social and bucket-list capability. Only reach is sold.

## MVP Classification

**[Secondary]** - the whole page. Priority P1 and post-launch by its own Status, and
[Current State - Roadmap](../current-state/roadmap.md) puts the whole of [Monetization](../product/monetization.md) there; nothing here is
strictly required for the initial release.

Not on this page: which capabilities are sold, which is [Monetization](../product/monetization.md)'s, and the ad
removal a subscription causes, which is [UC - See Ads As A Free User](uc-see-ads-as-a-free-user.md)'s.

## App Store Review Area

Relevant, and it is the page that changes an existing declaration.
[Implementation - Store Declarations](../implementation/store-declarations.md) records revenue today as "None. Free, no IAP, and no
ad code exists", and the first purchase makes that line false on both stores. Selling a
digital subscription means Apple's in-app-purchase rules rather than an external payment
path, a restore-purchases route the Boundary Conditions already require, subscription
metadata and pricing in both listings, and a paywall a reviewer must be able to reach and
read. The exact guideline numbers are not written here because they were not verified at
source; check them against the store consoles when the epic starts, the way the account
deletion citations were.

## Supported Evidence

Not implemented. The surfaces this will touch are:

- `libs/bite-tribe/settings/page` current `isFreeUser` and `isProUser` computed signals
- `libs/bite-tribe/profile/page` tier badge
- `libs/bite-tribe/store` for the shared entitlement state
- `apps/bite-tribe-firebase/functions` for the webhook and the gated callables

## Related GitHub Scope

- Issue [#1124] is the epic, BiteTribe Pro subscriptions, and stage 2 of the monetization
  umbrella [#1121]. Open
- Issue [#1122] is the entitlement foundation and Pro feature gating this depends on, stage 0
  of the same umbrella. Open,
  with its own ordered children - issue [#1126] specifies the entitlement model and the
  Free/Pro capability matrix and is open, and issue [#1127] stopped new accounts being created
  at tier 1 and is closed as completed
- Issue [#519] described this before and is closed as not planned; [#1124] owns the subject now

## Related Domains

- [Subscription](../domain/subscription.md)
- [User](../domain/user.md)
- [Bite](../domain/bite.md)

## Related Pages

- [Personas](../product/personas.md) - the food lover and the traveler this page used to name as actors
- [Monetization](../product/monetization.md) - the free and paid boundary, and why reach is the thing sold. A product
  page, not a domain
- [epic-1121][#1121] - the monetization umbrella, which sequences the three revenue channels and
  holds the product decisions the stage epics share
- [epic-1124][#1124] - this page's stage epic
- [epic-1122][#1122] - the entitlement foundation it waits on
- [UC - See Ads As A Free User](uc-see-ads-as-a-free-user.md) - what a subscription switches off
- [UC - Buy A Paid BiteTrail](uc-buy-a-paid-bitetrail.md) - the one-off purchase that reuses these rails
- [Implementation - Store Declarations](../implementation/store-declarations.md) - the revenue line this page makes false
- [Current State - Roadmap](../current-state/roadmap.md) - where Monetization sits relative to launch

[#519]: https://github.com/muhammedgaygisiz/travellers-apps/issues/519
[#1121]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1121
[#1122]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1122
[#1124]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1124
[#1126]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1126
[#1127]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1127
