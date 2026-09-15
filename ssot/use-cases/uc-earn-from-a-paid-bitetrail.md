# UC - Earn From A Paid BiteTrail

## Status

**Level:** L0.

Next to implement. Priority P1, post-launch, and the least built behaviour in the graph: the
workspace carries no Stripe dependency and no payout, ledger, balance or creator-onboarding
code of any kind. What exists is the shape money would hang from - a BiteTrail has `price` and
`currency` on its model, and a `sells` subcollection whose documents are written when a trail
is saved as a Bucket List, which `soldCount` is derived from. That is a counter, not a sale:
nothing has ever moved money. Issue [#1125] owns the work, as stage 3 of the monetization
umbrella [#1121].

## Goal

A creator who curated a BiteTrail is paid for it, on terms they could see before they
published.

This page owns the money on the creator's side: making them payable at all, the split that
decides the amount, the record each sale writes, and the balances and payouts that follow.
Buying the trail is [UC - Buy A Paid BiteTrail](uc-buy-a-paid-bitetrail.md). Pricing and publishing it are
[UC - Price A BiteTrail For Sale](uc-price-a-bitetrail-for-sale.md), which shows the creator what a sale will yield
but takes that quantity from here. Making the trail in the first place is
[UC - Create And Operate BiteTrails In The Business App](uc-create-and-operate-bitetrails-in-the-business-app.md).

## Actors

- **Bite Creator** - acts: completes payout onboarding, earns from each sale, and reads the
  balances those sales produce. Provisional: whether a BiteTrail creator is a role of its own
  or a persona holding `business` is undecided, and issue [#1615] settles it. This line is
  rewritten from [User Roles](../product/user-roles.md) when it does.

## Flow

- Creator completes identity verification, Stripe Connect payout onboarding and creator terms.
- Each sale writes a ledger entry splitting net proceeds 80 percent to the creator and 20 percent to BiteTribe.
- The creator sees pending and paid balances and receives payouts on schedule.
- A refund reverses the ledger entry. Revoking the buyer's access is the same event seen from [UC - Buy A Paid BiteTrail](uc-buy-a-paid-bitetrail.md).
- The 80/20 split is always on net proceeds. Gross-based wording cannot be honoured alongside a store commission and must never appear.
- A creator is payable only once identity verification, payout onboarding and creator terms are complete. The gate that stops an unpayable creator publishing is [UC - Price A BiteTrail For Sale](uc-price-a-bitetrail-for-sale.md)'s.

## MVP Classification

**[Secondary]** - the whole page. Priority P1 and post-launch by its own Status,
[Current State - Roadmap](../current-state/roadmap.md) puts the whole of [Monetization](../product/monetization.md) there, and no paid BiteTrail
ships at launch; nothing here is strictly required for the initial release.

Not on this page: setting the price and publishing the trail, which is
[UC - Price A BiteTrail For Sale](uc-price-a-bitetrail-for-sale.md), and the purchase that triggers a sale, which is
[UC - Buy A Paid BiteTrail](uc-buy-a-paid-bitetrail.md).

## App Store Review Area

Relevant, in a way none of the other monetization pages is. The amount this page owes a creator
is defined **after** the store commission, so the quantity comes from Apple's and Google's
terms rather than from BiteTribe, and a change in either changes what is owed. Separately, the
payout rail is Stripe Connect, which is a way of paying creators out and must never become a
way for a buyer to pay in - an alternative purchase path around in-app purchase is what both
stores refuse. Creator identity verification is a Stripe requirement rather than a store one.
No guideline numbers are written here because none was verified at source; check them against
the store consoles when the epic starts.

## Supported Evidence

Not implemented, and unlike its siblings there is nothing yet to point at: `stripe`, `payout`,
`ledger` and `balance` return nothing across `libs`, `apps` and `tools`. The surfaces this will
touch are:

- `apps/bite-tribe-firebase/functions` for the purchase webhook, the ledger and the payout job
- `libs/bite-tribe-business/create-bite-trail` for the net-proceeds disclosure at publish
- a creator earnings surface in the business app, which does not exist

## Related GitHub Scope

- Issue [#1125] is the epic, paid BiteTrails and creator revenue share, and stage 3 of the
  monetization umbrella [#1121]. Open
- Issue [#1615] decides whether a BiteTrail curator is a role or a persona, which is this page's
  actor. Open
- Payout-side identity verification has no issue of its own; it sits inside [#1125]

## Related Domains

- [Bite Trail](../domain/bite-trail.md)
- [Market Place](../domain/market-place.md)
- [User](../domain/user.md)

## Related Pages

- [Personas](../product/personas.md) - the food curator or vlogger this behaviour used to be described for
- [Monetization](../product/monetization.md) - the revenue-share rule and the free and paid boundary. A product page, not
  a domain
- [epic-1121](../github/epic-1121.md) - the monetization umbrella, which sequences the three revenue channels
- [epic-1125](../github/epic-1125.md) - this page's stage epic, shared with [UC - Buy A Paid BiteTrail](uc-buy-a-paid-bitetrail.md)
- [UC - Buy A Paid BiteTrail](uc-buy-a-paid-bitetrail.md) - the purchase that produces a sale
- [UC - Price A BiteTrail For Sale](uc-price-a-bitetrail-for-sale.md) - pricing and publishing, and the gate that
  reads this page's onboarding
- [UC - Create And Operate BiteTrails In The Business App](uc-create-and-operate-bitetrails-in-the-business-app.md) - making the BiteTrail at all
- [Current State - Roadmap](../current-state/roadmap.md) - where Monetization sits relative to launch

[#1121]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1121
[#1125]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1125
[#1615]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1615
