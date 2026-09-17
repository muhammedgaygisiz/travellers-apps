# UC - Price A BiteTrail For Sale

## Status

**Level:** L0.

Mostly delivered, and what is left is not packaging. Issue [#266] shipped the marketplace
surfaces this page was written for - the business dashboard listing a creator's own
BiteTrails, free BiteTrails reaching the Market Place, the sold counter derived from each
trail's `sells` subcollection, and the tap from a listing to the creator's profile - and
those surfaces are now owned by
[UC - Create And Operate BiteTrails In The Business App](uc-create-and-operate-bitetrails-in-the-business-app.md) and
[UC - Discover BiteTrails In The Marketplace](uc-discover-bitetrails-in-the-marketplace.md). Setting a price is built too, in the
create form, and there is no publish step anywhere. Nothing this page owns is built; issue
[#1125] owns it, as stage 3 of the monetization umbrella [#1121].

## Goal

Creators and Restaurant Owners should be able to package Bites into credible marketplace offerings.

This page owns the step between having a priced BiteTrail and having one that can be sold: the
bands a price has to fall within, what the creator is shown about their share before they
commit to it, and the gate that stops an unpayable creator selling. Making the trail and
setting its price is [UC - Create And Operate BiteTrails In The Business App](uc-create-and-operate-bitetrails-in-the-business-app.md); what a buyer
then sees in the Market Place is [UC - Discover BiteTrails In The Marketplace](uc-discover-bitetrails-in-the-marketplace.md); the purchase
itself is [UC - Buy A Paid BiteTrail](uc-buy-a-paid-bitetrail.md); and the money that follows a sale is
[UC - Earn From A Paid BiteTrail](uc-earn-from-a-paid-bitetrail.md).

## Actors

- **Bite Creator** - acts: puts a priced BiteTrail on sale. Provisional: whether a
  BiteTrail creator is a role of its own or a persona holding `business` is undecided, and
  issue [#1615] settles it. This line is rewritten from [User Roles](../product/user-roles.md) when it does.

## Flow

- Creator sets a price from the agreed price bands. Today the create form takes any non-negative amount in any offered currency; the bands do not exist, and are what this page adds.
- The flow shows what the creator earns per sale, expressed as net proceeds with the store commission visible. This flow only shows the number; the split that defines it is [UC - Earn From A Paid BiteTrail](uc-earn-from-a-paid-bitetrail.md)'s.
- A creator cannot put a paid BiteTrail on sale before payout onboarding is complete. The onboarding itself is [UC - Earn From A Paid BiteTrail](uc-earn-from-a-paid-bitetrail.md)'s. There is no publish step to gate today, so this gate arrives with the bands rather than on top of an existing one.

## MVP Classification

**[Secondary]** - the whole page. It exists only for a paid BiteTrail, and none ships at launch; [Current State - Roadmap](../current-state/roadmap.md) puts the whole of [Monetization](../product/monetization.md)
post-launch.

Not on this page: the marketplace surfaces issue [#266] already delivered, which belong to
[UC - Discover BiteTrails In The Marketplace](uc-discover-bitetrails-in-the-marketplace.md) and
[UC - Create And Operate BiteTrails In The Business App](uc-create-and-operate-bitetrails-in-the-business-app.md).

## App Store Review Area

Relevant only through the price. A paid BiteTrail is sold as a store product, so the price a
creator picks has to be one the store will actually sell at - which is the whole reason for
bands, and why the free-text amount the create form takes today is not enough - and the net
proceeds displayed depend on the commission the store takes. The surface itself is never
reviewed: it is in the business app, which is web-only, and only `apps/bite-tribe-ios` and
`apps/bite-tribe-android` carry a native project. The price-point mechanism on each store was not verified at source; check it
when issue [#1125] starts.

## Related GitHub Scope

- Issue [#266] is the packaging epic. Closed as completed; it delivered the surfaces named in
  Status, which other pages now own
- Issue [#1125] owns what makes a paid BiteTrail sellable, and is stage 3 of the monetization
  umbrella [#1121]. Open
- Issue [#1615] decides whether a BiteTrail curator is a role or a persona, which is this page's
  actor. Open
- [issue-1371](../records/issue-1371.md) removed the `organisationId` field and the assigned-users flow this page used
  to describe

## Related Domains

- [Bite Trail](../domain/bite-trail.md)
- [Market Place](../domain/market-place.md)
- [User](../domain/user.md)

## Related Pages

- [Personas](../product/personas.md) - the food curator or vlogger and the business user this page used to name as
  actors
- [Monetization](../product/monetization.md) - the free and paid boundary, and the revenue-share rule the disclosure
  renders. A product page, not a domain
- [epic-1121][#1121] - the monetization umbrella
- [epic-1125][#1125] - this page's stage epic
- [UC - Create And Operate BiteTrails In The Business App](uc-create-and-operate-bitetrails-in-the-business-app.md) - making the BiteTrail and setting
  the price these rules would constrain
- [UC - Earn From A Paid BiteTrail](uc-earn-from-a-paid-bitetrail.md) - the split behind the number this flow shows, and the
  onboarding behind its publish gate
- [UC - Buy A Paid BiteTrail](uc-buy-a-paid-bitetrail.md) - the purchase a published price makes possible
- [UC - Discover BiteTrails In The Marketplace](uc-discover-bitetrails-in-the-marketplace.md) - the listing, the sold counter and the
  profile link issue [#266] delivered
- [Current State - Roadmap](../current-state/roadmap.md) - where Monetization sits relative to launch

[#266]: https://github.com/muhammedgaygisiz/travellers-apps/issues/266
[#1121]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1121
[#1125]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1125
[#1615]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1615
