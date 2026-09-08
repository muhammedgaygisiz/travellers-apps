# UC - Own And Claim Restaurants

## Status

Partially implemented. The roles exist: \#1469 delivered `admin` and `business` as Firebase Auth custom claims and \#1472 guarded every operator callable, both driven by the admin app rather than by this use case. The shared model carries the ownership fields as of \#1074, and **an operator writes them** as of \#1077: `assignRestaurantOwner` and `revokeRestaurantOwner`, behind a surface in the admin app. **No rule enforces anything and nothing reads the field yet**: \#1078 replaces the open Firestore rules and \#1079 scopes the business dashboard, both unstarted. Specified through issue \#1069 as stage 0 of issue \#735.

This is the blocking prerequisite for every other stage of the Restaurant Interaction Platform.

## Goal

A restaurant has exactly one accountable owner: a normal BiteTribe user carrying the `business` role. Users can only read and write the restaurants assigned to them. Staff can act on those restaurants within a narrower permission set. Operators assign and revoke ownership.

## Why It Is Needed

Verified in the codebase on 25 July 2026, and re-checked on 8 September 2026:

- `Restaurant` in `libs/bite-tribe-common/model/src/lib/restaurant.ts` had no owner or claim field. Issue \#1074 added `ownerUserId`, `claimStatus`, `claimedAt`, and `claimedAtTimestamp` as optional fields, plus a `RestaurantClaim` model. ~~Nothing writes any of them.~~ **\#1077 is the writer**, and it removed `RestaurantClaim` with its barrel export: the model never had an importer, and direct assignment produces no claim document.
- ~~No roles, custom claims, or membership checks exist in `apps/bite-tribe-firebase/functions/src`.~~ **No longer true.** \#1469 delivered the `admin` and `business` roles as custom claims written only by `setUserRoles`, and \#1472 put `requireAdmin` on every operator callable with a build-failing endpoint classification. Two gaps remain and \#1075 owns them: there is no `staff` role, and there is **no backend guard for `business`** \- across the whole functions source `'business'` appears only in the role list and in deny tests, so the business app's gate is client-side only.
- `apps/bite-tribe-firebase/firestore.rules` grants read and write on every document to every authenticated user. **Still true.**

Any floor plan, table state, visit, or order written under those rules is writable by any logged-in user. The product vision for claimed restaurants assumes a capability that does not exist.

## Actors

- BiteTribe operator assigning and revoking ownership
- User with the `business` role holding a restaurant
- Restaurant staff member, holding the `staff` role

## Flow

Rewritten on 8 September 2026, and implemented by \#1077 down to the two lines marked below. There is **no self-service claim**: a restaurant is assigned by an operator, not requested by the restaurant.

- An operator picks a verified restaurant and an account holding `business` on the `restaurant-ownership` surface in the admin app, and links them with a reason. Both lists are the ones that already exist — the account list \#1476 built, and the restaurants collection — rather than a third way to find either.
- Assignment sets `ownerUserId`, `claimStatus: claimed` and the timestamps in one transaction. A restaurant that already has an owner is refused and the refusal names the current owner; reassignment is revoke then assign, so the log shows two decisions. Repeating the same assignment returns the current state rather than writing again.
- An account that does not hold `business` is refused as an assignment target, because every business-app route is gated on the role and an owner without it could not open the restaurant they own.
- Ownership is revoked by an operator with an attributable reason. Revoking deletes the owner and the grant timestamps and sets `claimStatus: revoked`; revoking a restaurant nobody holds is refused rather than writing `revoked` over `unclaimed`.
- **Still to come.** The business account adds and removes the `staff` on the restaurants it holds, and cannot touch a restaurant it does not hold (\#1537). The business dashboard shows only the restaurants assigned to the caller (\#1079).

Verification happens off-system, on the call the operator is already having. That is the "manual admin review for the first iteration" \#1069 proposed, with the review queue removed: a queue exists to hold information the operator has in front of them, and it brings a claim document, a five-state machine, contested and superseded states with it. See [[issue-1076]] for what was given up.

## Data Model

Added in issue \#1074, all optional so existing documents stay valid:

- `Restaurant.ownerUserId` - the current owner, absent when unowned.
- `Restaurant.claimStatus` - `unclaimed`, `claimed`, `revoked` after \#1077 reduced it. A missing value means `unclaimed`.
- `Restaurant.claimedAt` and `claimedAtTimestamp` - when the current ownership was granted, deleted when it is revoked.

~~`RestaurantClaim` in `libs/bite-tribe-common/model/src/lib/restaurant-claim.ts`.~~ **Removed by \#1077 rather than filled in.** It was added for the self-service flow, never had an importer, and direct assignment produces no claim document, so it went with its barrel export. `claimStatus` reduced with it \- `pending` and `disputed` existed only because of a review queue, so `unclaimed`, `claimed` and `revoked` are what assignment can produce.

There is no `claimedByUserId` on `Restaurant`. With one owner per restaurant it would duplicate `ownerUserId`, and who assigned it and why is in the operator log rather than on the document: both callables require a reason and log through `logOperatorAction`, the shape every operator action shares. See [[Implementation - Firebase Functions]].

## Key Behaviours

- Ownership is held by a normal user carrying the `business` role. There is no organisation entity: the `isOrganisation` and `organisationId` fields this was once going to build on never had a writer and were removed in [[issue-1371]].
- Roles are Firebase Auth custom claims set only by the backend, so they cannot be forged from the client. See [[Architecture - Auth]].
- **`admin`, `business` and `staff` are independent roles, not a hierarchy.** A staff account holds `staff` and **not** `business`, which is why `roleGuard` has to accept a set of roles: every business-app route is gated on `roleGuard('business')` today, so a staff account would otherwise be signed out at the door. Holding `business` and `staff` together is contradictory \- one operates a restaurant, the other is the narrowed set \- and `setUserRoles` refuses it.
- **Which restaurants an account is assigned to is a Firestore document, never a custom claim.** An assignment change then takes effect immediately rather than after up to an hour, there is no 1000-byte claim payload to grow into, and \#1078's rules read the same field \- a claim copy would be a second version of one fact that can silently disagree with it.
- **Who may grant which role is not uniform.** `admin` and `business` are operator decisions through the admin-only `setUserRoles`. `staff` turns over with ordinary hiring, so a business account grants it itself, for the restaurants it holds only \- a callable that let any `business` caller grant `staff` to any uid would be a privilege-escalation path into the business app dressed as a convenience. See [[issue-1537]].
- Assignment is idempotent, matching the existing `verifyRestaurantCandidate` rule.
- No restaurant can end up claimed by two owners. The read and the write are one transaction, so two operators assigning the same restaurant cannot both see it unowned and both write.
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
- Issue \#1077 - assign and revoke restaurant ownership, and remove the claim model; done
- Issue \#1537 - a business account manages the staff on its restaurant
- Issue \#1371 - removed the organisation fields this was first specified against
- Issue \#288 - concept of restaurant as a business entity
- Issue \#952 and \#130 - App Check, which protects the transport but not authorization

## Related Domains

- [[Restaurant]]
- [[User]]
- [[Floor Plan]]
