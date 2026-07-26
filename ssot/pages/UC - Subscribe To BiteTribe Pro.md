# UC - Subscribe To BiteTribe Pro

## Status

Next to implement. Priority P1, post-launch.

## Goal

A food lover who has outgrown their immediate surroundings can pay for BiteTribe Pro and immediately get discovery beyond the 15 km radius they are standing in.

## Actors

- Food lover
- Traveler

## Target Flow

- User reaches a Pro capability: a backend search, a city they are not standing in, or a radius beyond 15 km.
- The backend refuses the request with a gating error rather than failing generically.
- The app opens the paywall with copy naming the capability the user just reached.
- User selects a package and purchases through the store.
- The billing webhook verifies the purchase and writes the server-owned entitlement.
- The auth token refreshes and Pro capabilities become available without an app restart.
- Ads disappear.
- Subscription state, renewal date and cancellation route are visible in settings.

## Boundary Conditions

- A purchase reported by the client never grants access on its own.
- Restoring purchases returns the entitlement on a reinstall or a second device.
- A cancelled subscription keeps access until the end of the paid period; a refund revokes it immediately.
- A lapse forces a token refresh so access does not survive on a stale token.
- Free users keep full creation, social and bucket-list capability. Only reach is sold.

## Supported Evidence

Not implemented. The surfaces this will touch are:

- `libs/bite-tribe/settings/page` current `isFreeUser` and `isProUser` computed signals
- `libs/bite-tribe/profile/page` tier badge
- `libs/bite-tribe/store` for the shared entitlement state
- `apps/bite-tribe-firebase/functions` for the webhook and the gated callables

## Related GitHub Scope

- Issue \#1124 is the epic.
- Issue \#1122 provides the entitlement foundation this depends on.
- Issue \#519 described this before and was closed as superseded.

## Related Domains

- [[Subscription]]
- [[Monetization]]
- [[User]]
- [[Bite]]
