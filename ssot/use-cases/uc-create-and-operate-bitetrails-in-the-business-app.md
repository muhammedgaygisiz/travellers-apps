# UC - Create And Operate BiteTrails In The Business App

## Status

**Level:** L0.

Obsolete: BiteTrails are not created through the business app (`RD-UR-4`), so this surface is
removed; see `MVP Classification`. Until then it is supported, and smaller than its title. A
signed-in Restaurant Owner opens the business dashboard, sees the BiteTrails it owns, and
creates one from its own Bites through `create-bite-trail`, the form that also sets the
trail's price and currency, defaulted to `0` and `EUR`. Creating a trail is the whole of
operating one: nothing edits or deletes a BiteTrail from the business app, and there is no
publish step, no draft and no published flag. The route gate admits more than intended; see
`Authorization`. The organisation dashboard that used to sit in front of this flow is gone;
see `Related GitHub Scope`. Creating a BiteTrail in the consumer app, where it moves, is
[UC - Create A BiteTrail](uc-create-a-bitetrail.md).

## Goal

Creators and Restaurant Owners can create curated BiteTrail offerings.

This page owns making a BiteTrail exist in the business app: the dashboard list, the create form, and everything
that form writes, price and currency included. What has to be true for a priced trail to
actually sell is [UC - Price A BiteTrail For Sale](uc-price-a-bitetrail-for-sale.md); the money a sale produces is
[UC - Earn From A Paid BiteTrail](uc-earn-from-a-paid-bitetrail.md); what a buyer sees and does is
[UC - Discover BiteTrails In The Marketplace](uc-discover-bitetrails-in-the-marketplace.md) and [UC - Buy A Paid BiteTrail](uc-buy-a-paid-bitetrail.md).

## Actors

- **Restaurant Owner** - acts until the surface is removed: opens the business dashboard,
  creates a BiteTrail from its own Bites, and sets its price and currency.
- **Bite Creator** - not an actor, and named because creating a BiteTrail moves to it, in the
  consumer app rather than here (`RD-UR-4`, issue [#1519]). Whether a BiteTrail creator is a
  role of its own or a persona is not final; issue [#1615] settles it.
- **Restaurant Staff** - not an actor: it must not create BiteTrails
  ([User Roles](../product/user-roles.md)), although the route gate admits it until the
  surface is removed; see `Authorization`.

## Flow

- A Restaurant Owner opens the dashboard and sees the BiteTrails they own.
- The Restaurant Owner opens Create BiteTrail, picks from their own Bites, and creates the trail.
- The same form sets the trail's price and currency. Any non-negative amount in any offered currency is accepted; there are no price bands, and `0` means free.
- BiteTrail becomes available as a marketplace-related journey. There is no publish step: creation is what makes it visible.

## Authorization

The door is `roleGuard('business', 'staff')` on both routes, while `firestore.rules` gates
`/biteTrails/{biteTrailId}` create on `owns(request.resource.data, 'ownerId')` alone - so the
rules admit any signed-in account and only the surface is restricted.

`staff` must not create BiteTrails ([User Roles](../product/user-roles.md)), yet the route gate
admits it. The gap closes with the surface itself, which [#1519] removes, and gets no fix of
its own.

## MVP Classification

**[Obsolete]** - BiteTrails are not created through the business app (`RD-UR-4`); creating
one moves into the consumer app, [UC - Create A BiteTrail](uc-create-a-bitetrail.md). Removed by [#1519].

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
- Issue [#1519] moves creating a BiteTrail into the consumer app and removes this surface, under `RD-UR-4`
- Issue [#1615] decides whether a BiteTrail curator is a role or a persona. Open

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
[#1519]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1519
[#1615]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1615
