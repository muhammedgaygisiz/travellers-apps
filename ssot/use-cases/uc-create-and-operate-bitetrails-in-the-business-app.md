# UC - Create And Operate BiteTrails In The Business App

## Status

**Level:** L0.

Supported today, and smaller than its title. A signed-in business or staff account opens the
business dashboard, sees the BiteTrails it owns, and creates one from its own Bites through
`create-bite-trail`. That create form is also where a trail's price and currency are set: both
are required fields on the `BiteTrail` model, the form defaults them to `0` and `EUR`, and it
offers a currency selector beside a free-text amount. Creating a trail is the whole of
operating one - nothing edits or deletes a BiteTrail from the business app, and there is no
publish step, no draft and no published flag: a BiteTrail is live the moment it is created.

The organisation dashboard that used to sit in front of this flow is gone with its
`:organisationId` routes and its "employees" list, which read a field nothing ever wrote and
was therefore always empty; see [issue-1371](../records/issue-1371.md). That is also why issue [#266]'s "assigned users"
describes a mechanism which no longer exists.

Who may reach any of this is unsettled. The door is `roleGuard('business', 'staff')` on both
routes, while `firestore.rules` gates `/biteTrails/{biteTrailId}` create on
`owns(request.resource.data, 'ownerId')` alone - so the rules admit any signed-in account and
only the surface is restricted. Issue [#1615] decides whether a BiteTrail curator is a role of
its own or a persona holding `business`.

## Goal

Creators and business users can create curated BiteTrail offerings.

This page owns making a BiteTrail exist: the dashboard list, the create form, and everything
that form writes, price and currency included. What has to be true for a priced trail to
actually sell is [UC - Price A BiteTrail For Sale](uc-price-a-bitetrail-for-sale.md); the money a sale produces is
[UC - Earn From A Paid BiteTrail](uc-earn-from-a-paid-bitetrail.md); what a buyer sees and does is
[UC - Discover BiteTrails In The Marketplace](uc-discover-bitetrails-in-the-marketplace.md) and [UC - Buy A Paid BiteTrail](uc-buy-a-paid-bitetrail.md).

## Actors

- **Bite Creator** - acts: opens the business dashboard, creates a BiteTrail from its own
  Bites, and sets its price and currency. Provisional: whether a BiteTrail creator is a role of
  its own or a persona holding `business` is undecided, and issue [#1615] settles it. This line
  is rewritten from [User Roles](../product/user-roles.md) when it does.

## Flow

- A business user opens the dashboard and sees the BiteTrails they own.
- The business user opens Create BiteTrail, picks from their own Bites, and creates the trail.
- The same form sets the trail's price and currency. Any non-negative amount in any offered currency is accepted; there are no price bands, and `0` means free.
- BiteTrail becomes available as a marketplace-related journey. There is no publish step: creation is what makes it visible.

## MVP Classification

**[Secondary]** - the whole page. Its only surface is the business app, which
[Current State - Release Candidate Test Charter](../current-state/release-candidate-test-charter.md) puts out of scope for this release candidate
with a soft launch of its own, so nothing here is strictly required for the initial release.

Not on this page: the conditions that make a priced trail sellable, which are
[UC - Price A BiteTrail For Sale](uc-price-a-bitetrail-for-sale.md), and everything that happens after a sale, which is
[UC - Earn From A Paid BiteTrail](uc-earn-from-a-paid-bitetrail.md).

## App Store Review Area

Not relevant, because the business app is not store-distributed. Only `apps/bite-tribe-ios` and
`apps/bite-tribe-android` carry a native project; this app ships on the web. It would become
relevant if the business app were ever packaged for a store, at which point its sign-in, its
role gate and its data handling would be reviewed for the first time.

## Supported Evidence

- Business `dashboard`, which lists the signed-in user's BiteTrails and links to creation
- Business `create-bite-trail`, whose form group carries `name`, `price` and `currency` with
  `price` defaulted to `0` and validated as a required non-negative number

A BiteTrail is owned by the account that creates it. The route takes no owner parameter: the
owner is the signed-in user.

## Related GitHub Scope

- Issue [#266], the packaging epic, covered BiteTrail creation from selected Bites, free
  BiteTrail access and marketplace listing. Closed as completed. Its "assigned users" half
  describes the organisation mechanism [issue-1371](../records/issue-1371.md) removed and no longer exists
- Issue [#1615] decides whether a BiteTrail curator is a role or a persona, which is this page's
  actor. Open

## Related Domains

- [Bite Trail](../domain/bite-trail.md)
- [Market Place](../domain/market-place.md)
- [Bite](../domain/bite.md)
- [User](../domain/user.md)

## Related Pages

- [Personas](../product/personas.md) - the food curator or vlogger and the business user this page used to name as
  actors
- [User Roles](../product/user-roles.md) - the `business` and `staff` roles the door gate tests
- [UC - Price A BiteTrail For Sale](uc-price-a-bitetrail-for-sale.md) - what has to be true before a priced trail can sell
- [UC - Earn From A Paid BiteTrail](uc-earn-from-a-paid-bitetrail.md) - the money a sale produces
- [UC - Discover BiteTrails In The Marketplace](uc-discover-bitetrails-in-the-marketplace.md) - how a created trail is found
- [UC - Buy A Paid BiteTrail](uc-buy-a-paid-bitetrail.md) - the purchase itself

[#266]: https://github.com/muhammedgaygisiz/travellers-apps/issues/266
[#1615]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1615
