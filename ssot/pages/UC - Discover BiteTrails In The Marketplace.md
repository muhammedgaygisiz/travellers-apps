# UC - Discover BiteTrails In The Marketplace

## Status

**Level:** L0.

Supported today. The Market Place page reads the whole `biteTrails` collection and shows a
card per BiteTrail, each enriched with a sold count taken from its `sells` subcollection; a
card opens a detail page listing that BiteTrail's Bites, with a map view beside it. A free
BiteTrail carries the button that takes it as a Bucket List, or returns to the one already
saved. **No paid BiteTrail is published at launch**, which is what keeps that safe: purchase
is not built, and a priced BiteTrail would today show its Bites to anyone and offer no way to
buy. [[UC - Buy A Paid BiteTrail]] owns both halves.

## Goal

Users can discover curated BiteTrail packages in the Market Place.

This page owns the three surfaces a BiteTrail is found through - the Market Place listing, the
detail page and its map view - and nothing beyond opening one. Taking a free BiteTrail as a
Bucket List belongs to [[UC - Save And Rate BiteTrails Through Bucket Lists]], buying a paid
one to [[UC - Buy A Paid BiteTrail]], and packaging one to
[[UC - Price And Publish A BiteTrail]].

## Actors

- **Bite Creator** - acts: opens the Market Place, browses the BiteTrails listed there, and
  inspects one through its detail page and map view. The listing applies no role or ownership
  check, so a creator browsing their own BiteTrail sees exactly what anyone else does.

## Flow

- User opens Market Place.
- The app lists BiteTrails.
- User opens a BiteTrail detail page.
- User can inspect a BiteTrail map view.

## MVP Classification

**[MVP]** - the whole page. A BiteTrail that cannot be found is a BiteTrail nobody has, and
the Market Place is the only way into one.

Not on this page: buying. [[UC - Buy A Paid BiteTrail]] is `Next to implement` at P1,
post-launch, and owns both the purchase and the locking that has to come with it.

## App Store Review Area

Not relevant, because nothing priced is reachable and no device permission is requested. No
paid BiteTrail is published at launch, so every BiteTrail a reviewer can open is free and
carries its `Get for free` button. It becomes relevant the moment a priced BiteTrail is
published: today the detail page would list its Bites in full and offer no purchase control,
because the footer carrying that control renders only when `isFree` holds - so a reviewer
would meet priced digital content with no way to buy it. Both the purchase, which has to go
through store in-app purchase, and the locking that must come with it belong to
[[UC - Buy A Paid BiteTrail]] and [[Monetization]].

## Supported Evidence

- `market-place`
- `bite-trail/:biteTrailId`
- `bite-trail/:biteTrailId/map-view`
- BiteTrail API.

## Related GitHub Scope

- Issue \#266, the `Organisation/Food Vlogger wants to offer packages of bites (BiteTrails)`
  epic, describes the marketplace MVP for creator or food-vlogger BiteTrail packages and was
  the Eid campaign's vehicle. Closed as completed.
- The three surfaces themselves have no issue behind them: pull request \#662 set the Market
  Place up, \#666 added the BiteTrail loading, and \#684 the price display and the detail
  page. None of the three names an issue.

## Related Domains

- [[Market Place]]
- [[Bite Trail]]
- [[Bite]]

## Related Pages

- [[Personas]] - the audiences the `Actors` mapping displaced: the food lover, the traveler,
  and the food curator or vlogger
- [[UC - Save And Rate BiteTrails Through Bucket Lists]] - what taking a free BiteTrail does
- [[UC - Buy A Paid BiteTrail]] - the purchase and the locking a priced BiteTrail still lacks
- [[UC - Price And Publish A BiteTrail]] - the creator side of the same epic
- [[Monetization]] - what is sold and what stays free
