# UC - Own And Claim Restaurants

## Status

Partially specified in code. The shared model carries the ownership and claim types as of issue \#1074; no writer, collection, role, or rule exists yet. Specified through issue \#1069 as stage 0 of issue \#735.

This is the blocking prerequisite for every other stage of the Restaurant Interaction Platform.

## Goal

A restaurant has exactly one accountable owner: a normal BiteTribe user carrying an additional business role. Users can only read and write the restaurants they own. Staff can act on those restaurants within a narrower permission set. Admins can review and resolve claims.

## Why It Is Needed

Verified in the codebase on 25 July 2026:

- `Restaurant` in `libs/bite-tribe-common/model/src/lib/restaurant.ts` had no owner or claim field. Issue \#1074 added `ownerUserId`, `claimStatus`, `claimedAt`, and `claimedAtTimestamp` as optional fields, plus a `RestaurantClaim` model, but nothing writes them.
- No roles, custom claims, or membership checks exist in `apps/bite-tribe-firebase/functions/src`.
- `apps/bite-tribe-firebase/firestore.rules` grants read and write on every document to every authenticated user.

Any floor plan, table state, visit, or order written under those rules is writable by any logged-in user. The product vision for claimed restaurants assumes a capability that does not exist.

## Actors

- User with the business role requesting ownership
- Restaurant staff member
- Admin reviewing claims

## Planned Flow

- A user with the business role searches existing restaurants in the business app and starts a claim.
- The claim captures the requesting user and supporting evidence.
- The restaurant moves to `pending`.
- An admin reviews open claims and approves, rejects, or marks a claim contested.
- Approval sets the owning `ownerUserId` and `claimStatus: claimed` atomically, and rejects competing claims in the same transaction.
- The owner invites staff, granting them a narrower role.
- The business dashboard shows only restaurants the caller owns.
- Ownership can later be revoked, with an attributable reason.

## Data Model

Added in issue \#1074, all optional so existing documents stay valid:

- `Restaurant.ownerUserId` - the current owner, absent when unowned.
- `Restaurant.claimStatus` - `unclaimed`, `pending`, `claimed`, `disputed`, `revoked`. A missing value means `unclaimed`.
- `Restaurant.claimedAt` and `claimedAtTimestamp` - when the current ownership was granted.
- `RestaurantClaim` in `libs/bite-tribe-common/model/src/lib/restaurant-claim.ts` - `restaurantId`, `requestedByUserId`, `status`, `evidenceNotes`, `reviewedByUserId`, `reviewedAt`, `reviewedAtTimestamp`, `decisionReason`.

The restaurant's `claimStatus` and a claim's `status` are deliberately separate state machines. A claim resolves to `pending`, `approved`, `rejected`, `withdrawn`, or `superseded`. A contested claim is several `pending` claims pointing at one `restaurantId` while the restaurant sits at `disputed`; approving one marks the rest `superseded`.

There is no `claimedByUserId` on `Restaurant`. With one owner per restaurant it would duplicate `ownerUserId`, and the audit trail of who filed and who reviewed lives on the claim document.

## Key Behaviours

- Ownership is held by a normal user carrying an additional business role. There is no organisation entity: the `isOrganisation` and `organisationId` fields this was once going to build on never had a writer and were removed in [[issue-1371]].
- Roles are Firebase Auth custom claims set only by the backend, so they cannot be forged from the client.
- Approval is idempotent, matching the existing `verifyRestaurantCandidate` rule.
- No restaurant can end up claimed by two owners.
- Existing unowned restaurants keep working for consumer read paths and are visible to admins for triage.

## Success Criteria

- A restaurant cannot be edited by a user who does not own it, proven with emulator rule tests for both allow and deny.
- The Firestore rules no longer contain a blanket `allow read, write: if request.auth != null` for all documents.
- A revoked role stops working within one token refresh cycle.
- Both apps' existing flows still work end to end after the rules change.

## Risk

Replacing the open Firestore rules is the highest-regression-risk change in the epic. It needs its own branch, its own verification pass against both apps in the emulator, and a rollback plan. It must not be combined with feature work.

## Related GitHub Scope

- Issue \#1069 - Restaurant ownership, claiming and authorization, with six child issues
- Issue \#288 - concept of restaurant as a business entity
- Issue \#952 and \#130 - App Check, which protects the transport but not authorization

## Related Domains

- [[Restaurant]]
- [[User]]
- [[Floor Plan]]
