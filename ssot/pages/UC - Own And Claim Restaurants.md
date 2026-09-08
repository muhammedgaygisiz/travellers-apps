# UC - Own And Claim Restaurants

## Status

Partially implemented. The roles exist: \#1469 delivered `admin` and `business` as Firebase Auth custom claims and \#1472 guarded every operator callable, both driven by the admin app rather than by this use case. The shared model carries the ownership fields as of \#1074, and **nothing writes them** \- \#1077 is the writer. No rule enforces anything: \#1078 is unstarted. Specified through issue \#1069 as stage 0 of issue \#735.

This is the blocking prerequisite for every other stage of the Restaurant Interaction Platform.

## Goal

A restaurant has exactly one accountable owner: a normal BiteTribe user carrying the `business` role. Users can only read and write the restaurants assigned to them. Staff can act on those restaurants within a narrower permission set. Operators assign and revoke ownership.

## Why It Is Needed

Verified in the codebase on 25 July 2026, and re-checked on 8 September 2026:

- `Restaurant` in `libs/bite-tribe-common/model/src/lib/restaurant.ts` had no owner or claim field. Issue \#1074 added `ownerUserId`, `claimStatus`, `claimedAt`, and `claimedAtTimestamp` as optional fields, plus a `RestaurantClaim` model. **Nothing writes any of them, and `RestaurantClaim` has never had an importer** \- it was added for the self-service claim flow that \#1076 closed as not planned, and \#1077 removes it.
- ~~No roles, custom claims, or membership checks exist in `apps/bite-tribe-firebase/functions/src`.~~ **No longer true.** \#1469 delivered the `admin` and `business` roles as custom claims written only by `setUserRoles`, and \#1472 put `requireAdmin` on every operator callable with a build-failing endpoint classification. Two gaps remain and \#1075 owns them: there is no `staff` role, and there is **no backend guard for `business`** \- across the whole functions source `'business'` appears only in the role list and in deny tests, so the business app's gate is client-side only.
- `apps/bite-tribe-firebase/firestore.rules` grants read and write on every document to every authenticated user. **Still true.**

Any floor plan, table state, visit, or order written under those rules is writable by any logged-in user. The product vision for claimed restaurants assumes a capability that does not exist.

## Actors

- BiteTribe operator assigning and revoking ownership
- User with the `business` role holding a restaurant
- Restaurant staff member, holding the `staff` role

## Planned Flow

Rewritten on 8 September 2026. There is **no self-service claim**: a restaurant is assigned by an operator, not requested by the restaurant.

- An operator picks a verified restaurant and an account holding `business` in the admin app, and links them with a reason.
- Assignment sets `ownerUserId`, `claimStatus: claimed` and the timestamps atomically. A restaurant that already has an owner is refused rather than reassigned; reassignment is revoke then assign, so the log shows two decisions.
- The business account adds and removes the `staff` on the restaurants it holds, and cannot touch a restaurant it does not hold.
- The business dashboard shows only the restaurants assigned to the caller.
- Ownership can be revoked by an operator, with an attributable reason.

Verification happens off-system, on the call the operator is already having. That is the "manual admin review for the first iteration" \#1069 proposed, with the review queue removed: a queue exists to hold information the operator has in front of them, and it brings a claim document, a five-state machine, contested and superseded states with it. See [[issue-1076]] for what was given up.

## Data Model

Added in issue \#1074, all optional so existing documents stay valid:

- `Restaurant.ownerUserId` - the current owner, absent when unowned.
- `Restaurant.claimStatus` - `unclaimed`, `pending`, `claimed`, `disputed`, `revoked`. A missing value means `unclaimed`.
- `Restaurant.claimedAt` and `claimedAtTimestamp` - when the current ownership was granted.
- `RestaurantClaim` in `libs/bite-tribe-common/model/src/lib/restaurant-claim.ts` - `restaurantId`, `requestedByUserId`, `status`, `evidenceNotes`, `reviewedByUserId`, `reviewedAt`, `reviewedAtTimestamp`, `decisionReason`.

**`RestaurantClaim` is being removed rather than filled in.** It was added for the self-service flow, has never had an importer, and direct assignment produces no claim document: \#1077 deletes it with its barrel export. `claimStatus` reduces with it \- `pending` and `disputed` exist only because of a review queue, so `unclaimed`, `claimed` and `revoked` are what assignment can produce.

There is no `claimedByUserId` on `Restaurant`. With one owner per restaurant it would duplicate `ownerUserId`, and who assigned it and why is in the operator log rather than on the document.

## Key Behaviours

- Ownership is held by a normal user carrying the `business` role. There is no organisation entity: the `isOrganisation` and `organisationId` fields this was once going to build on never had a writer and were removed in [[issue-1371]].
- Roles are Firebase Auth custom claims set only by the backend, so they cannot be forged from the client. See [[Architecture - Auth]].
- **`admin`, `business` and `staff` are independent roles, not a hierarchy.** A staff account holds `staff` and **not** `business`, which is why `roleGuard` has to accept a set of roles: every business-app route is gated on `roleGuard('business')` today, so a staff account would otherwise be signed out at the door. Holding `business` and `staff` together is contradictory \- one operates a restaurant, the other is the narrowed set \- and `setUserRoles` refuses it.
- **Which restaurants an account is assigned to is a Firestore document, never a custom claim.** An assignment change then takes effect immediately rather than after up to an hour, there is no 1000-byte claim payload to grow into, and \#1078's rules read the same field \- a claim copy would be a second version of one fact that can silently disagree with it.
- **Who may grant which role is not uniform.** `admin` and `business` are operator decisions through the admin-only `setUserRoles`. `staff` turns over with ordinary hiring, so a business account grants it itself, for the restaurants it holds only \- a callable that let any `business` caller grant `staff` to any uid would be a privilege-escalation path into the business app dressed as a convenience. See [[issue-1537]].
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

- Issue \#1069 - Restaurant ownership, claiming and authorization, with seven child issues
- Issue \#1075 - the three roles as verified identity, mostly delivered by \#1469 and \#1472
- Issue \#1076 - self-service restaurant claiming, closed as not planned
- Issue \#1077 - assign and revoke restaurant ownership, and remove the claim model
- Issue \#1537 - a business account manages the staff on its restaurant
- Issue \#1371 - removed the organisation fields this was first specified against
- Issue \#288 - concept of restaurant as a business entity
- Issue \#952 and \#130 - App Check, which protects the transport but not authorization

## Related Domains

- [[Restaurant]]
- [[User]]
- [[Floor Plan]]
