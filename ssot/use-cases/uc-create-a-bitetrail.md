# UC - Create A BiteTrail

## Status

**Level:** L1

Built in the Bite Creator app, `bite-tribe-creator`, a web-only app of its own (issue [#2130],
`RD-UR-11`). Any signed-in BiteTribe account may sign in there and create a BiteTrail from its
own Bites; no role is required. The business app no longer creates BiteTrails. Creating a
trail is the whole of operating one: nothing edits or deletes a BiteTrail from the creator app,
and there is no publish step, no draft and no published flag. A creator role that will gate the
app is issue [#2328].

## Goal

A signed-in account packages its own Bites into a BiteTrail, without being registered as a
restaurant.

This page owns making a BiteTrail exist: the account's list of its own trails, the create
form, and everything that form writes, price and currency included. What has to be true for a
priced trail to sell is [UC - Price A BiteTrail For Sale](uc-price-a-bitetrail-for-sale.md);
finding it is [UC - Discover BiteTrails In The Marketplace](uc-discover-bitetrails-in-the-marketplace.md);
taking a free one as a Bucket List is
[UC - Save And Rate BiteTrails Through Bucket Lists](uc-save-and-rate-bitetrails-through-bucket-lists.md).

## Actors

- **Bite Creator** - acts: signs in to the creator app, creates a BiteTrail from its own
  Bites, and sets its price and currency. It carries no claim, and the app asks for none
  (`RD-UR-4`, `RD-UR-11`).
- **Restaurant Owner** - acts no differently: holding `business` changes nothing here, and it
  creates through the same app as any other account.

## Guarantees

Once a BiteTrail has been created:

| #   | Guarantee                                                                                                                                                         |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | A `/biteTrails/{biteTrailId}` document exists, owned by the signed-in account through `ownerId`, naming at least one of that account's Bites in `biteIds`         |
| G2  | It carries a price of `0` or more and a currency, which is what [UC - Price A BiteTrail For Sale](uc-price-a-bitetrail-for-sale.md) reads                         |
| G3  | Its document shape is the one the business app wrote, so a trail created there before issue [#2130] reads, lists and is acquired the same way as one created here |

## Flow

- A signed-out visitor opens the creator app and lands on its start page, which offers Log In
  and Sign Up. Signing in, or registering, lands on the account's BiteTrails.
- The account sees the BiteTrails it owns, each with where its photo stands, and opens Create
  BiteTrail.
- It names the trail, optionally adds a description, a location and a photo, picks from its
  own Bites, and creates the trail. A trail with no Bite cannot be created.
- The same form sets the trail's price and currency, defaulted to `0` and `EUR`. Any
  non-negative amount in any offered currency is accepted; there are no price bands, and `0`
  means free.
- A photo chosen for the trail is published only once the image check passed it (issue
  [#2141]). The page saves under a modal, writes the trail `pending`, uploads the photo and
  waits for the verdict; it then says the trail was created, that its photo is still being
  checked, or that the photo was refused and why. A refused photo is deleted and the trail
  stays without it. A photo whose check could not run stays being checked while the backend
  checks it again over about sixteen hours, and ends published, refused, or failed (issue
  [#2142]).
- Back on the list, the new trail is there. Creation is what makes it visible in the Market
  Place.

## Authorization

**Enforced.** Every route of the creator app but its start and auth pages carries
`authGuard` alone, and the app binds no `REQUIRED_ROLES`, so sign-in refuses nobody for a
missing role. `firestore.rules` gates `/biteTrails/{biteTrailId}` create on
`owns(request.resource.data, 'ownerId')`, which admits any signed-in account naming itself as
the owner. The app and the rules therefore admit the same accounts.

**Not enforced.** No role narrows who may publish into the Market Place. That is deliberate
and interim; issue [#2328] adds the creator role, in the app and in the rules together.

## MVP Classification

**[Secondary]** - best guess. Launch content is seeded by BiteTribe-held accounts
(`RD-UR-5`), and paid BiteTrails, which give creation its business case, are epic [#1125].

## App Store Review Area

Not relevant, because the creator app is web-only: only `apps/bite-tribe-ios` and
`apps/bite-tribe-android` carry a native project, and neither creates a BiteTrail. A trail
created here is still user-generated content shown in the store-distributed consumer app's
Market Place, which is why the user-generated-content safeguards of `RD-UR-7` apply to what
it displays.

## Supported Evidence

- `libs/bite-tribe-creator/shell`, `routes.ts` - `bite-trails` and `create-bite-trail` behind
  `authGuard` only, and a route spec that fails when a second guard appears on either
- `libs/bite-tribe-creator/bite-trails` - the account's own trails, read by `ownerId`, with
  each photo's state
- `libs/bite-tribe-creator/create-bite-trail` - the form, whose group carries `name`, `price`
  and `currency` with `price` defaulted to `0` and validated as a required non-negative
  number, and whose data access writes through `BiteTribeApiService.createBiteTrail`
- `apps/bite-tribe-creator-e2e`, `create-bite-trail.spec.ts` - an account holding no role and
  a `business` account each create a trail from their own Bite, and the stored document is
  owned by that account
- `libs/bite-tribe-business/shell`, `routes.spec.ts` - the business app routes neither
  `bite-trails` nor `create-bite-trail`

## Related GitHub Scope

- Issue [#2130] builds the creator app, moves creation into it and removes it from the
  business app. Part of epic [#2123].
- Issue [#2328] gates the creator app on a creator role.
- Issue [#1519] placed creation in the consumer app; `RD-UR-11` moves it to the creator app
  instead.
- Issue [#1615] asks whether a BiteTrail creator is a role or a persona; issue [#2328]
  answers it with a role.
- Epic [#266], the packaging epic, covered BiteTrail creation from selected Bites, free
  BiteTrail access and marketplace listing.
- Issue [#2141] publishes a trail's photo only once the image check passed it. Part of epic
  [#2137].
- Issue [#2142] checks again a trail's photo whose check could not run. Part of epic [#2137].

## Related Domains

- [Bite Trail](../domain/bite-trail.md)
- [Market Place](../domain/market-place.md)
- [Bite](../domain/bite.md)

## Related Pages

- [User Roles](../product/user-roles.md) - who may create a BiteTrail
- [Recorded Decisions](../decisions/recorded-decisions.md) - `RD-UR-4`, `RD-UR-5` and `RD-UR-11`
- [Architecture - Deployment](../architecture/deployment.md) - where the creator app is
  deployed

[#266]: https://github.com/muhammedgaygisiz/travellers-apps/issues/266
[#1125]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1125
[#1519]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1519
[#1615]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1615
[#2123]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2123
[#2130]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2130
[#2137]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2137
[#2141]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2141
[#2142]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2142
[#2328]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2328
