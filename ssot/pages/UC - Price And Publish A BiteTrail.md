# UC - Price And Publish A BiteTrail

## Status

**Level:** L0.

Mostly delivered, and what is left is not packaging. Issue \#266 shipped the marketplace
surfaces this page was written for - the business dashboard listing a creator's own BiteTrails,
free BiteTrails reaching the Market Place, the sold counter derived from each trail's `sells`
subcollection, and the tap from a listing to the creator's profile through
`onGoToProfileClick(ownerId)` - and it is closed as completed. Those surfaces are owned
elsewhere: the dashboard by [[UC - Create And Operate BiteTrails In The Business App]], and the
listing, the counter and the profile link by [[UC - Discover BiteTrails In The Marketplace]].
One clause of the old flow described a mechanism that no longer exists - assigning users to a
BiteTrail read the `organisationId` field on user documents, which nothing ever wrote and which
[[issue-1371]] removed together with the organisation dashboard built around it.

What remains for this page is pricing a BiteTrail and publishing it for sale, none of which is
built. Issue \#1125 owns it, as stage 3 of the monetization umbrella \#1121.

## Goal

Creators and business users should be able to package Bites into credible marketplace offerings.

This page owns the step between having a BiteTrail and having one that can be sold: the price,
the bands it has to fall within, the publish action, and what the creator is shown about their
share before they take it. Making the BiteTrail is
[[UC - Create And Operate BiteTrails In The Business App]]; what a buyer then sees in the Market
Place is [[UC - Discover BiteTrails In The Marketplace]]; the purchase itself is
[[UC - Buy A Paid BiteTrail]]; and the money that follows a sale is
[[UC - Earn From A Paid BiteTrail]].

## Actors

- **Bite Creator** - acts: prices a BiteTrail and publishes it for sale. Provisional: whether a
  BiteTrail creator is a role of its own or a persona holding `business` is undecided, and
  issue \#1615 settles it. This line is rewritten from [[User Roles]] when it does.

## Flow

- Creator sets a price from the agreed price bands and publishes.
- The publish flow shows what the creator earns per sale, expressed as net proceeds with the store commission visible. This flow only shows the number; the split that defines it is [[UC - Earn From A Paid BiteTrail]]'s.
- A creator cannot publish a paid BiteTrail before payout onboarding is complete. The onboarding itself is [[UC - Earn From A Paid BiteTrail]]'s.

## MVP Classification

**[Secondary]** - the whole page. Pricing and publishing exist only for a paid BiteTrail, and
none is published at launch; [[Current State - Roadmap]] puts the whole of [[Monetization]]
post-launch.

Not on this page: the marketplace surfaces issue \#266 already delivered, which belong to
[[UC - Discover BiteTrails In The Marketplace]] and
[[UC - Create And Operate BiteTrails In The Business App]].

## App Store Review Area

Relevant only through the price. A paid BiteTrail is sold as a store product, so the price a
creator picks has to be one the store will actually sell at - which is why this flow offers
bands rather than a free-text amount - and the net proceeds it displays depend on the
commission the store takes. The publish surface itself is never reviewed: it is in the business
app, which is web-only, and only `apps/bite-tribe-ios` and `apps/bite-tribe-android` carry a
native project. The price-point mechanism on each store was not verified at source; check it
when issue \#1125 starts.

## Related GitHub Scope

- Issue \#266 is the packaging epic. Closed as completed; it delivered the surfaces named in
  Status, which other pages now own
- Issue \#1125 owns pricing and publishing a paid BiteTrail, and is stage 3 of the monetization
  umbrella \#1121. Open
- Issue \#1615 decides whether a BiteTrail curator is a role or a persona, which is this page's
  actor. Open
- [[issue-1371]] removed the `organisationId` field and the assigned-users flow this page used
  to describe

## Related Domains

- [[Bite Trail]]
- [[Market Place]]
- [[User]]

## Related Pages

- [[Personas]] - the food curator or vlogger and the business user this page used to name as
  actors
- [[Monetization]] - the free and paid boundary, and the revenue-share rule the disclosure
  renders. A product page, not a domain
- [[epic-1121]] - the monetization umbrella
- [[epic-1125]] - this page's stage epic
- [[UC - Create And Operate BiteTrails In The Business App]] - making the BiteTrail that gets
  priced here
- [[UC - Earn From A Paid BiteTrail]] - the split behind the number this flow shows, and the
  onboarding behind its publish gate
- [[UC - Buy A Paid BiteTrail]] - the purchase a published price makes possible
- [[UC - Discover BiteTrails In The Marketplace]] - the listing, the sold counter and the
  profile link issue \#266 delivered
- [[Current State - Roadmap]] - where Monetization sits relative to launch
