# UC - Own And Claim Restaurants

## Status

Not implemented. Specified through issue \#1069 as stage 0 of issue \#735.

This is the blocking prerequisite for every other stage of the Restaurant Interaction Platform.

## Goal

A restaurant has exactly one accountable owner. Business users can only read and write the restaurants they own. Staff can act on those restaurants within a narrower permission set. Admins can review and resolve claims.

## Why It Is Needed

Verified in the codebase on 25 July 2026:

- `Restaurant` in `libs/bite-tribe-common/model/src/lib/restaurant.ts` has no owner, organisation, or claim field.
- No roles, custom claims, or membership checks exist in `apps/bite-tribe-firebase/functions/src`.
- `apps/bite-tribe-firebase/firestore.rules` grants read and write on every document to every authenticated user.

Any floor plan, table state, visit, or order written under those rules is writable by any logged-in user. The product vision for claimed restaurants assumes a capability that does not exist.

## Actors

- Business user requesting ownership
- Restaurant staff member
- Admin reviewing claims

## Planned Flow

- A business user searches existing restaurants in the business app and starts a claim.
- The claim captures the requesting organisation and supporting evidence.
- The restaurant moves to `pending`.
- An admin reviews open claims and approves, rejects, or marks a claim contested.
- Approval sets the owning `organisationId` and `claimStatus: claimed` atomically, and rejects competing claims in the same transaction.
- The owner invites staff, granting them a narrower role.
- The business dashboard shows only restaurants the caller's organisation owns.
- Ownership can later be revoked, with an attributable reason.

## Key Behaviours

- Ownership is held by an organisation, not by a single user, because `users` and `biteTrails` already carry `organisationId`.
- Roles and organisation membership are Firebase Auth custom claims set only by the backend, so they cannot be forged from the client.
- Approval is idempotent, matching the existing `verifyRestaurantCandidate` rule.
- No restaurant can end up claimed by two organisations.
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
