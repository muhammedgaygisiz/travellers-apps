# UC - Own And Claim Restaurants

## Status

**Level:** L0.
Implemented for a single owner. The roles exist: \#1469 delivered `admin` and `business` as Firebase Auth custom claims and \#1472 guarded every operator callable, both driven by the admin app rather than by this use case. The shared model carries the ownership fields as of \#1074, and **an operator writes them** as of \#1077: `assignRestaurantOwner` and `revokeRestaurantOwner`, behind a surface in the admin app. **The rules enforce it** as of \#1078: a Restaurant and its Menu are writable by the assigned account and by an Operator and by nobody else, and `ownerUserId`, `claimStatus`, `claimedAt` and `claimedAtTimestamp` are writable by no client at all - the forgery demonstrated against the emulator on 8 September 2026 is now a deny test. **The business app reads it** as of \#1079: the dashboard lists only the restaurants assigned to the caller, and the two routes that edit one refuse a restaurant assigned elsewhere by direct URL. **The business account manages its own staff** as of \#1537: `addRestaurantStaff` and `removeRestaurantStaff` write the `staff` claim and a `/restaurantStaff/{uid}` record together, authorised by `ownerUserId` for a restaurant owner and by `RD-UR-6` for an operator. What that role may then _do_ is still nothing, deliberately - \#1537 scoped itself to the grant. The rules deploy by hand: they bind production only once `npx nx firebase-deploy-rules bite-tribe-firebase` has run. Specified through issue \#1069 as stage 0 of issue \#735.

This is the blocking prerequisite for every other stage of the Restaurant Interaction Platform.

## Goal

A restaurant has exactly one accountable owner: a normal BiteTribe user carrying the `business` role. Users can only read and write the restaurants assigned to them. Staff can act on those restaurants within a narrower permission set. Operators assign and revoke ownership.

This page owns who holds a restaurant, how that hold is granted and revoked, and what
reads and writes it gates - in the callables, in `firestore.rules`, and in the business
app's own scope. What an account may then _do_ with a restaurant it holds belongs to the
pages for those behaviours.

## Actors

- **BiteTribe Operator** - assigns and revokes ownership with an attributable reason, and
  can act on any restaurant under `RD-UR-6`, so a restaurant that removes its last account
  with access has a way back.
- **Restaurant Owner** - holds the `business` role and the restaurants assigned to it, edits
  those restaurants and their menus, and adds and removes their staff.
- **Restaurant Staff** - holds the `staff` role, granted by the Restaurant Owner. Named here
  because this page is where the grant is made, not because the role can yet act on anything.

## Flow

Rewritten on 8 September 2026, implemented by \#1077, \#1078, \#1079 and \#1537. There is **no self-service claim**: a restaurant is assigned by an operator, not requested by the restaurant.

- An operator picks a verified restaurant and an account holding `business` on the `restaurant-ownership` surface in the admin app, and links them with a reason. Both lists are the ones that already exist — the account list \#1476 built, and the restaurants collection — rather than a third way to find either.
- Assignment sets `ownerUserId`, `claimStatus: claimed` and the timestamps in one transaction. A restaurant that already has an owner is refused and the refusal names the current owner; reassignment is revoke then assign, so the log shows two decisions. Repeating the same assignment returns the current state rather than writing again.
- An account that does not hold `business` is refused as an assignment target, because every business-app route is gated on the role and an owner without it could not open the restaurant they own.
- Ownership is revoked by an operator with an attributable reason. Revoking deletes the owner and the grant timestamps and sets `claimStatus: revoked`; revoking a restaurant nobody holds is refused rather than writing `revoked` over `unclaimed`.
- The assignment becomes visible to the assigned account on its next load. `DashboardDataAccessService.restaurantsLoader` queries `restaurants` where `ownerUserId` equals the caller's uid, so the dashboard map and the restaurants list hold exactly what the account was given. There is no token to refresh, because ownership is a document field rather than a claim.
- A restaurant assigned elsewhere is absent from that list **and refused at the route**. `documentOwnerGuard` sits on `restaurant/:restaurantId` and `restaurant/:restaurantId/menu/:menuId` and reads the same field, so a bookmark, a shared link, or a session that outlived a revocation lands back on the account's own list with one sentence and no detail about who does hold the restaurant.
- An account holding nothing sees an empty state naming BiteTribe support rather than an empty list, because there is nothing it can do here to fix it: self-service claiming is closed as not planned (\#1076).
- **The account holding a restaurant adds and removes its staff, and cannot touch a restaurant it does not hold** (\#1537). It adds an existing BiteTribe account by the email address it signed up with, from `restaurant/:restaurantId/staff` behind the same `documentOwnerGuard` the edit routes carry - so a staff account, which holds no restaurant, cannot reach the page that would let it hire. The `staff` claim and the `/restaurantStaff/{uid}` record are written together and neither is left behind by a failure; an account holding `admin` or `business` is refused as a target in both directions; and every grant and removal reaches Cloud Logging with the caller, the target and the restaurant. An operator can do all of it from the staff card on `restaurant-ownership`, which is the way back when a restaurant removes its last account with access.
- **A removed staff account keeps its session for up to an hour** - the ID token's lifetime - and is then returned to the login page by `roleGuard`, not to a broken screen. Both surfaces say so in the removal confirmation rather than implying it is instant.
- **\#1537 made the role grantable, not useful.** A staff account signs into the business app and sees an empty list: the dashboard scopes by `ownerUserId` (\#1079) and the rules give `staff` no write (\#1078). The issue put both out of scope by name. Narrowing what staff may see and do is a change to those two and has no owning issue.

**\#1079 closed the gap between the assignment and what the account can _see_.** Verified against the emulator on 8 September 2026, before it: `restaurantsLoader` read the whole `restaurants` collection with no owner filter, so a business account was shown a restaurant assigned to a _different_ account and could open its edit form. The list had never been ownership-driven, so that was not something \#1077 regressed - it was the half of the epic's "the effect is visible in the business app" criterion \#1079 owned. \#1078 had already refused the _save_, which left the account reaching a form it could not submit and being told only that something went wrong; \#1079 removed the form from the list rather than improving that message.

Verification happens off-system, on the call the operator is already having. That is the "manual admin review for the first iteration" \#1069 proposed, with the review queue removed: a queue exists to hold information the operator has in front of them, and it brings a claim document, a five-state machine, contested and superseded states with it. See \#1076 for what was given up.

## Why It Is Needed

When this stage was specified on 25 July 2026, nothing in the system could say who a
restaurant belonged to. Three gaps, each now closed:

- **The model carried no owner.** `Restaurant` in
  `libs/bite-tribe-common/model/src/lib/restaurant.ts` had no owner or claim field. \#1074
  added `ownerUserId`, `claimStatus`, `claimedAt` and `claimedAtTimestamp` as optional
  fields, and \#1077 became their writer. See `Data Model`.
- **The backend asserted no roles.** \#1469 delivered `admin` and `business` as custom claims
  written only by `setUserRoles`; \#1472 put `requireAdmin` on every operator callable, with
  an endpoint classification that fails the build for an unguarded one; and \#1075 added
  `staff`, generalised `requireAdmin` into `requireRole`, and made `business` and `staff`
  mutually exclusive. A `business` caller is guarded by `requireRestaurantAuthority`, which
  admits `business` or `admin` through `requireAnyRole` and then decides _which_ restaurant
  by `Restaurant.ownerUserId`; it guards the staff callables and the QR-token callables of
  \#1086.
- **The rules granted read and write on every document to every authenticated user.** \#1078
  replaced them with ownership-scoped rules. Reads stayed where they were on purpose:
  narrowing them is \#1079's visible scope, and \#1079 narrows them in the client query
  rather than in the rules, so an unowned restaurant is still readable and simply not listed.

Under the old rules any floor plan, table state, visit, or order was writable by any
logged-in user, which is why this stage blocks the rest of \#735: the product vision for
claimed restaurants assumed a capability that did not exist.

## Data Model

Added in issue \#1074, all optional so existing documents stay valid:

- `Restaurant.ownerUserId` - the current owner, absent when unowned.
- `Restaurant.claimStatus` - `unclaimed`, `claimed`, `revoked` after \#1077 reduced it. A missing value means `unclaimed`.
- `Restaurant.claimedAt` and `claimedAtTimestamp` - when the current ownership was granted, deleted when it is revoked.

`RestaurantClaim`, once at `libs/bite-tribe-common/model/src/lib/restaurant-claim.ts`, was **removed by \#1077 rather than filled in**. It was added for the self-service flow, never had an importer, and direct assignment produces no claim document, so it went with its barrel export. `claimStatus` reduced with it \- `pending` and `disputed` existed only because of a review queue, so `unclaimed`, `claimed` and `revoked` are what assignment can produce.

There is no `claimedByUserId` on `Restaurant`. With one owner per restaurant it would duplicate `ownerUserId`, and who assigned it and why is in the operator log rather than on the document: both callables require a reason and log through `logOperatorAction`, the shape every operator action shares. See [[Implementation - Firebase Functions]].

## Key Behaviours

- Ownership is held by a normal user carrying the `business` role. There is no organisation entity: the `isOrganisation` and `organisationId` fields this was once going to build on never had a writer and were removed in [[issue-1371]].
- Roles are Firebase Auth custom claims set only by the backend, so they cannot be forged from the client. See [[Architecture - Auth]].
- **`admin`, `business` and `staff` are independent roles, not a hierarchy.** A staff account holds `staff` and **not** `business`, which is why `roleGuard` has to accept a set of roles: every business-app route is gated on `roleGuard('business')` today, so a staff account would otherwise be signed out at the door. Holding `business` and `staff` together is contradictory \- one operates a restaurant, the other is the narrowed set \- and `setUserRoles` refuses it.
- **Which restaurants an account is assigned to is a Firestore document, never a custom claim.** An assignment change then takes effect immediately rather than after up to an hour, there is no 1000-byte claim payload to grow into, and \#1078's rules read the same field \- a claim copy would be a second version of one fact that can silently disagree with it.
- **Who may grant which role is not uniform.** `admin` and `business` are operator decisions through the admin-only `setUserRoles`. `staff` turns over with ordinary hiring, so a business account grants it itself, for the restaurants it holds only \- a callable that let any `business` caller grant `staff` to any uid would be a privilege-escalation path into the business app dressed as a convenience. See \#1537.
- Assignment is idempotent, matching the existing `verifyRestaurantCandidate` rule.
- No restaurant can end up claimed by two owners. The read and the write are one transaction, so two operators assigning the same restaurant cannot both see it unowned and both write.
- Existing unowned restaurants keep working for consumer read paths and are visible to admins for triage.
- **\#1079 shipped the strict filter: a business account sees the restaurants assigned to it and nothing else.** Decided 8 September 2026, when \#1077 gave the assignment a writer. The alternative considered was falling back to the unowned restaurants so that nobody loses access on the day it deploys - refused, because it is a rule that \#1078 then has to contradict, and a boundary with an exception is not a boundary. The consequence is accepted rather than designed around: nothing in production is assigned today, so every business account sees an empty list until an operator assigns it something. Assigning the existing restaurants is operator work that has to happen before or alongside \#1079, not a migration.

## Success Criteria

- A restaurant cannot be edited by a user who does not own it and does not hold `admin`, proven with emulator rule tests for both allow and deny. The `admin` exception is required by `RD-UR-6` in [[User Roles]] and needs its own allow test.
- The Firestore rules no longer contain a blanket `allow read, write: if request.auth != null` for all documents.
- A revoked role stops working within one token refresh cycle.
- A business account can add and remove the staff on a restaurant it holds, and is refused with `permission-denied` on one it does not. Proven by the callable's own spec; the association's read boundary is proven against the emulator.
- Both apps' existing flows still work end to end after the rules change.

## Risk

Replacing the open Firestore rules is the highest-regression-risk change in the epic. It needs its own branch, its own verification pass against both apps in the emulator, and a rollback plan. It must not be combined with feature work.

## MVP Classification

**[Secondary]** - the whole page. Operator assignment and revocation, the business app's
scoping to the caller, and staff management are stage 0 of the Restaurant Interaction
Platform: nothing in production is assigned today, and the epic they unblock is post-launch.

Not on this page: the ownership-scoped Firestore rules themselves. \#1078 replaced rules
under which any signed-in account could write any document, which is launch-critical, but
the rules are a whole-database artefact rather than this page's - see
[[Architecture - Firebase]], `Firestore Security Rules`.

## App Store Review Area

Not relevant, because nothing on this page reaches a store surface. Ownership is decided in
the callables and in `firestore.rules`, and the two apps that exercise it - the admin app
and the business app - are web surfaces: only `bite-tribe-ios` and `bite-tribe-android`
are packaged with Capacitor, and [[Implementation - Store Declarations]] covers that
consumer client alone.

This stops being true the moment a business or admin client is submitted to a store, at
which point the empty list a staff account is shown becomes a minimum-functionality
question rather than a known limitation.

## Related GitHub Scope

- Issue \#1069 - Restaurant ownership, claiming and authorization, with seven child issues
- Issue \#1075 - the three roles as verified identity; `admin` and `business` came from \#1469 and \#1472, and \#1075 itself added `staff`, generalised `requireAdmin` into `requireRole`, and made `business` and `staff` mutually exclusive; done
- Issue \#1076 - self-service restaurant claiming, closed as not planned
- Issue \#1077 - assign and revoke restaurant ownership, and remove the claim model; done
- Issue \#1078 - ownership-scoped Firestore rules replacing the open ones; done
- Issue \#1079 - scope the business app to the restaurants assigned to the caller; done
- Issue \#1537 - a business account manages the staff on its restaurant; done
- Issue \#1371 - removed the organisation fields this was first specified against
- Issue \#288 - concept of restaurant as a business entity
- Issue \#952 and \#130 - App Check, which protects the transport but not authorization

## Related Domains

- [[Restaurant]]
- [[User]]
- [[Floor Plan]]
- [[User Roles]]

## Related Pages

- [[Personas]] - the audience the `Actors` mapping displaced: the restaurant owner or
  business maintainer
- [[Architecture - Auth]] - how the roles are carried, and what each app binds
- [[Architecture - Firebase]] - the Firestore security rules as a whole
- [[Implementation - Firebase Functions]] - `logOperatorAction` and the operator callables
- \#1076 - self-service claiming, closed as not planned
- [[issue-1371]] - removed the organisation fields this was first specified against
