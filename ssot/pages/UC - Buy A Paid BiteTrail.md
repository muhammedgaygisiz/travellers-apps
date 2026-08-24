# UC - Buy A Paid BiteTrail

## Status

Next to implement. Priority P1, post-launch.

## Goal

A food lover can buy a curated food journey, and the creator who curated it gets paid for it.

## Actors

- Food lover
- Traveler
- Food curator or vlogger

## Target Flow

User side:

- User browses the Market Place and sees a paid BiteTrail with its price.
- Opening it shows a locked preview: name, image, location, description and Bite count, without the Bites themselves.
- User purchases through store in-app purchase.
- The backend verifies the purchase and writes the purchase record.
- The BiteTrail's Bites unlock, and the trail can be saved as a Bucket List as usual.

Creator side:

- Creator curates a BiteTrail in the business app.
- Creator completes identity verification, Stripe Connect payout onboarding and creator terms.
- Creator sets a price from the agreed price bands and publishes.
- The publish flow shows what the creator earns per sale, expressed as net proceeds with the store commission visible.
- Each sale writes a ledger entry splitting net proceeds 80 percent to the creator and 20 percent to BiteTribe.
- The creator sees pending and paid balances and receives payouts on schedule.

## Boundary Conditions

- A non-buyer cannot read a paid BiteTrail's Bites, enforced in Firestore rules and callables, not only in the UI.
- A refund reverses the ledger entry and revokes access.
- Unpublishing does not revoke access for existing buyers.
- A creator cannot publish a paid BiteTrail before payout onboarding is complete.
- Free BiteTrails, which are those priced at 0, behave exactly as they do today.
- The 80/20 split is always on net proceeds. Gross-based wording cannot be honoured alongside a store commission and must never appear.

## Supported Evidence

Not implemented. Today a BiteTrail has `price` and `currency`, and saving one as a Bucket List writes a lightweight sell record that `soldCount` is derived from. There is no payment behind it, and nothing restricts reading a priced BiteTrail's Bites. The surfaces this will touch are:

- `libs/bite-tribe-common/model/src/lib/bite-trail.ts`
- `libs/bite-tribe/market-place/page` and `libs/bite-tribe/bite-trail/page`
- `libs/bite-tribe-business/create-bite-trail`
- `apps/bite-tribe-firebase/functions` and `apps/bite-tribe-firebase/firestore.rules`

## Related GitHub Scope

- Issue \#1125 is the epic.
- Issue \#1122 provides the entitlement foundation and issue \#1124 the purchase rails this reuses.
- Issue \#1069 provides the verified owner identity that payouts require.
- Issue \#266 and [[UC - Mature BiteTrail Marketplace Packages]] cover the packaging work this builds on.

## Related Domains

- [[Bite Trail]]
- [[Market Place]]
- [[Monetization]]
- [[Subscription]]
- [[Bite]]
- [[User]]
