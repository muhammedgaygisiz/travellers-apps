# Subscription

## Purpose

A Subscription is a user's paid access to BiteTribe Pro, and the Entitlement is the server-owned record of what that access currently grants.

The two are separate on purpose. A subscription is a commercial relationship with a store; an entitlement is the answer to "may this request proceed?" that the backend can evaluate on every call.

## Why It Exists

The goal of this domain is to answer:

> Is this user Pro right now, and can the backend prove it without asking the client?

Every paywall in the product reduces to that question. If the answer lives anywhere the client can influence, the paywall is decorative.

## Business Rules

- There are two tiers: Free (0) and Pro (1).
- An entitlement is written only by the backend. No client write path may create, modify or delete one.
- A purchase reported by a client never grants access. Access follows from a verified billing webhook.
- Access ends when the subscription lapses, is refunded, or is revoked, and the change must take effect without waiting for the default token lifetime.
- A cancelled subscription keeps access until the end of the paid period.
- A refund revokes access immediately.
- A subscription follows the account, not the device. Restoring purchases on a reinstall or a second device returns the entitlement.
- `subscriptionTier` on the public user document is a backend-written display mirror and is never the authority.
- An admin may grant or revoke an entitlement for support cases, and every such action is recorded with actor, target, reason and timestamp.

## Required Data

The model does not exist yet. It is specified by issue \#1126 and will cover at least:

| Field      | Description                                                      |
| ---------- | ---------------------------------------------------------------- |
| User       | The account the entitlement belongs to.                          |
| Tier       | Free or Pro.                                                     |
| Active     | Whether the entitlement currently grants Pro.                    |
| Source     | Store purchase, promotional grant, or admin grant.               |
| Period end | When the current paid period ends.                               |
| Store      | Which store the subscription originates from.                    |
| Timestamps | Created, updated, and the transition history needed for support. |

An auth custom claim carries the minimum needed to evaluate a gate on every request, and is deliberately small because claims travel on every call and are size-limited.

## Relationships

```text
Subscription
|-- User (account identity)
|-- Entitlement (server-owned access record)
|-- Auth custom claim (fast path for gates)
|-- Store subscription (Apple or Google, via RevenueCat)
|-- Monetization (what the entitlement unlocks)
```

## Lifecycle

```text
User reaches a gated capability
|
Paywall opened
|
Purchase through store in-app purchase
|
Billing webhook verified
|
Entitlement written and custom claim refreshed
|
Pro capabilities enforced by Functions and rules
|
Renewal, billing retry, grace period, cancellation, refund or expiry
|
Entitlement updated and access adjusted
```

## Permissions

- Registered user
  - Read their own entitlement.
  - Purchase, restore and cancel through the store.
- Any user
  - No write access to any entitlement, including their own.
- Backend
  - Sole writer, driven by verified webhooks or an audited admin action.
- Admin
  - Grant or revoke with a recorded reason.

## Use Cases

Next to implement:

- [[UC - Subscribe To BiteTribe Pro]]
- [[UC - See Ads As A Free User]]
- [[UC - Buy A Paid BiteTrail]]

## Related Epics

- [[epic-1122]] entitlement foundation and Pro gating
- [[epic-1124]] Pro subscriptions
- [[epic-1125]] paid BiteTrails, which reuses the same rails

## Technical Implementation

Nothing is implemented yet. The current state is:

```text
libs/bite-tribe-common/model/src/lib/public-user.ts        subscriptionTier?: number
libs/bite-tribe/settings/page                              local isFreeUser / isProUser computed signals
libs/bite-tribe/profile/page                               tier badge rendering for 0, 1 and 2
apps/bite-tribe-firebase/functions/src/functions/users/create-user-on-auth-create.ts
```

The last of these writes `subscriptionTier: 1` for every new account, which issue \#1127 corrects.

## Current Limitations

- No entitlement store, no custom claims, no billing integration.
- No gate is enforced in any callable.
- `firestore.rules` allows every authenticated user to write every document, so `subscriptionTier` is client-writable today.
- The settings and profile pages each compute the tier locally instead of reading shared state.

## Future Ideas

- A third tier for creators or organisations.
- Promotional and win-back grants.
- Family sharing or gifting.
- Entitlements that unlock a single capability rather than a whole tier.

## Sources Used

- [[Monetization]]
- [[User]]
- [[Architecture - Auth]]
- [[Architecture - Firebase]]
- [[Glossary]]
