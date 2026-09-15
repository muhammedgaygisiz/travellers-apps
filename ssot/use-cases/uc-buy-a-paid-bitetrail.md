# UC - Buy A Paid BiteTrail

## Status

**Level:** L0.

Next to implement. Priority P1, post-launch. Nothing of the purchase exists: no store client,
no purchase record, no lock. `isFree` is `(price ?? -1) === 0` in
`bite-trail-data-access.service.ts` and reaches exactly one decision - whether the detail page
shows its footer and add button - while the template renders every Bite unconditionally, so a
priced BiteTrail today would show its contents to anyone and offer no way to buy. Nothing is
reachable, because no paid BiteTrail is published; see [UC - Discover BiteTrails In The Marketplace](uc-discover-bitetrails-in-the-marketplace.md).
Issue [#1125] owns the work.

## Goal

A food lover can buy a curated food journey.

This page owns the purchase and what it unlocks: the locked preview a non-buyer sees, the store
transaction, the purchase record the backend writes, and the reading of the Bites that follows.
What the creator earns from that sale is [UC - Earn From A Paid BiteTrail](uc-earn-from-a-paid-bitetrail.md); pricing and
publishing the trail are [UC - Price A BiteTrail For Sale](uc-price-a-bitetrail-for-sale.md); finding it is
[UC - Discover BiteTrails In The Marketplace](uc-discover-bitetrails-in-the-marketplace.md); and taking a free one as a Bucket List is
[UC - Save And Rate BiteTrails Through Bucket Lists](uc-save-and-rate-bitetrails-through-bucket-lists.md).

## Actors

- **Bite Creator** - acts: opens a paid BiteTrail in the Market Place, buys it, and reads the
  Bites it unlocks. Buying carries no role and no entitlement of its own - a purchase is
  recorded against the account, and `BITE_TRIBE_ROLES` holds only `admin`, `business` and
  `staff`.

## Flow

- User browses the Market Place and sees a paid BiteTrail with its price.
- Opening it shows a locked preview: name, image, location, description and Bite count, without the Bites themselves.
- User purchases through store in-app purchase.
- The backend verifies the purchase and writes the purchase record.
- The BiteTrail's Bites unlock, and the trail can be saved as a Bucket List as usual.

## Boundary Conditions

- A non-buyer cannot read a paid BiteTrail's Bites, enforced in Firestore rules and callables, not only in the UI.
- A refund revokes access. Reversing the ledger entry is the same event seen from [UC - Earn From A Paid BiteTrail](uc-earn-from-a-paid-bitetrail.md).
- Unpublishing does not revoke access for existing buyers.
- Free BiteTrails, which are those priced at 0, behave exactly as they do today.

## MVP Classification

**[Secondary]** - the whole page. Priority P1 and post-launch by its own Status,
[Current State - Roadmap](../current-state/roadmap.md) puts the whole of [Monetization](../product/monetization.md) there, and no paid BiteTrail is
published at launch, so nothing here is reachable in the shipping app.

Not on this page: what the creator earns from the sale, which is
[UC - Earn From A Paid BiteTrail](uc-earn-from-a-paid-bitetrail.md), and setting the price, which is
[UC - Price A BiteTrail For Sale](uc-price-a-bitetrail-for-sale.md).

## App Store Review Area

Relevant, and it is one of the two pages that make an existing declaration false.
[Implementation - Store Declarations](../implementation/store-declarations.md) records revenue today as "None. Free, no IAP, and no
ad code exists", and the first purchase of a BiteTrail ends that on both stores. Selling
digital content means the store's own in-app-purchase rails rather than an external payment
path, a restore route so a reinstall does not lose what was bought, the product declared in
both consoles, and a locked preview a reviewer can reach and read without buying. The exact
guideline numbers are not written here because they were not verified at source; check them
against the store consoles when the epic starts.

## Supported Evidence

Not implemented. Today a BiteTrail has `price` and `currency`, and saving one as a Bucket List writes a lightweight sell record that `soldCount` is derived from. There is no payment behind it, and nothing restricts reading a priced BiteTrail's Bites. The surfaces this will touch are:

- `libs/bite-tribe-common/model/src/lib/bite-trail.ts`
- `libs/bite-tribe/market-place/page` and `libs/bite-tribe/bite-trail/page`
- `apps/bite-tribe-firebase/functions` and `apps/bite-tribe-firebase/firestore.rules`

## Related GitHub Scope

- Issue [#1125] is the epic, paid BiteTrails and creator revenue share, and stage 3 of the
  monetization umbrella [#1121]. Open
- Issue [#1122] is the entitlement foundation, stage 0, and issue [#1124] the Pro subscription
  rails this purchase reuses, stage 2. Both open
- Issue [#266], the packaging epic, is closed as completed; what is left of packaging is
  [UC - Price A BiteTrail For Sale](uc-price-a-bitetrail-for-sale.md)

## Related Domains

- [Bite Trail](../domain/bite-trail.md)
- [Market Place](../domain/market-place.md)
- [Subscription](../domain/subscription.md)
- [Bite](../domain/bite.md)
- [User](../domain/user.md)

## Related Pages

- [Personas](../product/personas.md) - the food lover and the traveler this page used to name as actors
- [Monetization](../product/monetization.md) - the free and paid boundary. A product page, not a domain
- [epic-1121](../github/epic-1121.md) - the monetization umbrella
- [epic-1125](../github/epic-1125.md) - this page's stage epic, shared with [UC - Earn From A Paid BiteTrail](uc-earn-from-a-paid-bitetrail.md)
- [UC - Earn From A Paid BiteTrail](uc-earn-from-a-paid-bitetrail.md) - what the creator gets from this purchase
- [UC - Price A BiteTrail For Sale](uc-price-a-bitetrail-for-sale.md) - pricing and publishing the trail being bought
- [UC - Discover BiteTrails In The Marketplace](uc-discover-bitetrails-in-the-marketplace.md) - finding it beforehand
- [UC - Save And Rate BiteTrails Through Bucket Lists](uc-save-and-rate-bitetrails-through-bucket-lists.md) - what a bought trail becomes
- [Implementation - Store Declarations](../implementation/store-declarations.md) - the revenue line this page makes false
- [Current State - Roadmap](../current-state/roadmap.md) - where Monetization sits relative to launch

[#266]: https://github.com/muhammedgaygisiz/travellers-apps/issues/266
[#1121]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1121
[#1122]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1122
[#1124]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1124
[#1125]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1125
