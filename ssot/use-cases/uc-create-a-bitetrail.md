# UC - Create A BiteTrail

## Status

**Level:** L0.

Next to implement, and not built: no consumer-app route creates a BiteTrail today. Creation
still happens in the business app, on
[UC - Create And Operate BiteTrails In The Business App](uc-create-and-operate-bitetrails-in-the-business-app.md), which issue [#1519]
removes when it moves creation here. The page reaches L1 with that issue.

## Goal

A signed-in account packages its own Bites into a BiteTrail from the consumer app, without
being registered as a restaurant.

This page owns making a BiteTrail exist: choosing the Bites, naming the trail, setting its
price and currency, and publishing it into the Market Place. What has to be true for a priced
trail to sell is [UC - Price A BiteTrail For Sale](uc-price-a-bitetrail-for-sale.md); finding it is
[UC - Discover BiteTrails In The Marketplace](uc-discover-bitetrails-in-the-marketplace.md); taking a free one as a Bucket List is
[UC - Save And Rate BiteTrails Through Bucket Lists](uc-save-and-rate-bitetrails-through-bucket-lists.md).

## Actors

- **Bite Creator** - acts, provisionally: creates and publishes the BiteTrail in the consumer
  app, which carries no role gate (`RD-UR-4`). Whether a BiteTrail creator is a role of its
  own or a persona is not final; issue [#1615] settles it.
- **Restaurant Owner** - acts no differently: holding `business` changes nothing here, because
  publishing goes through the same consumer surface.

## Flow

- A signed-in account opens BiteTrail creation in the consumer app, behind `authGuard` only.
- It picks from its own Bites, names the trail, sets its price and currency, and publishes it
  into the Market Place.

## MVP Classification

**[Secondary]** - best guess. Launch content is seeded without this surface, by an Operator
granting `business` to BiteTribe-held accounts (`RD-UR-5`), and issue [#1519] is sequenced
behind content reporting.

## App Store Review Area

Relevant: this widens who publishes user-generated content into the Market Place. Issue
[#1519] names the guidelines involved.

## Related GitHub Scope

- Issue [#1519] - moves BiteTrail creation from the business app into the consumer app
- Issue [#1615] - decides whether a BiteTrail creator is a role of its own or a persona. Open

## Related Domains

- [Bite Trail](../domain/bite-trail.md)
- [Market Place](../domain/market-place.md)
- [Bite](../domain/bite.md)

## Related Pages

- [User Roles](../product/user-roles.md) - who may create a BiteTrail today and in the target state
- [Recorded Decisions](../decisions/recorded-decisions.md) - `RD-UR-4` and `RD-UR-5`
- [UC - Create And Operate BiteTrails In The Business App](uc-create-and-operate-bitetrails-in-the-business-app.md) - the obsolete business-app
  surface this page replaces

[#1519]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1519
[#1615]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1615
