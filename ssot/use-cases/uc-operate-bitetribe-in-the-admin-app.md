# UC - Operate BiteTribe In The Admin App

## Status

**Level:** L1
Supported today. The app exists, deploys, and is gated on the `admin` role as of issue [#1469].
Account management - roles, subscription tier and blocking - Bite search and removal,
restaurant-candidate verification, restaurant ownership, the unmatched Bite places and the
operational migrations are its surfaces. Epic [#1471], which grew the app into the operations
tool, is closed with every issue under it complete.

## Goal

BiteTribe-internal operations live in an app only BiteTribe Operators can sign into, separate
from the app a restaurant maintains its own data in. This page owns which operator surfaces
exist and what each one may do; what an operator's action then means for the data it touches
belongs to the page that owns that data.

## Actors

- **BiteTribe Operator** - the only actor. Holds `admin`, signs in, and works from the
  dashboard.
- **Restaurant Owner** - does not act here, but is named because operator work grants and
  revokes the `business` role and the restaurants it holds.
- **Bite Creator** - does not act here either, and is named because an operator can block the
  account and remove its Bites without it being told.

## Flow

The workflow this app exists to make possible: a restaurant calls BiteTribe and asks to claim a
place; the operator verifies the claim on the call, and optionally identifies the Bites that
belong to that place; in the admin app the operator creates the verified restaurant, sets its
owner, and grants that owner the `business` role in one backend action; the restaurant then
signs into the business app and maintains its own opening hours, menu and profile. The third
and fourth steps are the point of the split - a restaurant never grants itself business access,
and an operator never needs the business app to do operator work.

What ships today:

1. An operator is granted `admin` through `grant-role.mjs`, run with service-account credentials.
2. They sign into the admin app with a normal BiteTribe account.
3. Sign-in verifies the `admin` role before it succeeds; an account without it gets the generic login failure. `roleGuard('admin')` backs that up on the routes for a restored session or a revoked role.
4. They land on the dashboard, a list of the operator surfaces the tool offers.
5. **User management** lists every BiteTribe account with the roles it holds, and grants or revokes them. It reads `listUsersWithRoles` and writes `setUserRoles`, both admin-only.

Only the roles, the subscription tier and the account's access are editable. The identity fields are read-only rather than offering a change nothing can save.

Blocking sits below both editable sections, separated by a rule and behind a confirmation that names the account. It is the one action on the form that takes something away, and it would otherwise be a misclick away from the role checkboxes.

6. **Restaurant candidates** lists the pending candidates with the Bite evidence behind each, and **Bite places** lists place names Bites carry that no verified restaurant answers to yet. Both open the new-restaurant form, which creates the verified restaurant. Both moved out of the business dashboard with issue [#1473].
7. **Restaurant ownership** assigns a verified restaurant to an account holding `business`, and revokes that assignment. Both go through admin-only callables that write the fields on the restaurant document (issue [#1077]). The surface reuses the account list user management already loads rather than adding a second way to find an account, and offers only accounts holding the role.

A restaurant that already has an owner offers no picker at all: reassignment is revoke and then assign, so the operator log carries a reason for the removal and a reason for the grant. Revoking sits below a rule and behind a confirmation naming the restaurant and the account, on the same terms as blocking.

8. **Bite search** finds a Bite by its name or one of its tags and shows what BiteTribe holds about it. It calls `searchBites`, the same callable the consumer app's search drives. Selecting a Bite is where deleting an improper one will attach (issue [#1475]).

The same card removes it. A required reason and a confirmation sit between the operator and `deleteBiteAsOperator`, below a rule, because the deletion is irreversible and reaches further than the Bite (issue [#1475]).

9. **The operational migrations** are one dashboard entry each — new version notification, review timestamps backfill, Bite address backfill, restaurant clustering, image migration, geohash migration. See [UC - Run Operational Migrations](uc-run-operational-migrations.md).

## Why It Is Needed

The privileged surface used to be one app. `bite-tribe-business` held both what a **restaurant** does to its own data and what **we** do to the platform, and the only check on it was "is signed in".

Two problems in one, both verified before issue [#1469]:

- No separation. `migrations` and restaurant-candidate verification are BiteTribe-internal operations sitting in the app we intend to give restaurants. Any restaurant that logged in could run our migrations. Issue [#1473] moved both.
- No gate. `authGuard` asks whether a user is signed in, never who they are, and `apps/bite-tribe-firebase/firestore.rules` still grants read and write on every document to every authenticated user.

## Key Behaviours

- Roles are Firebase Auth custom claims, written only by the backend.
- **A missing role fails the login rather than blocking a page.** An account signed in and then refused would learn that its password was right, that it exists, and which role guards the app. The generic failure tells it nothing. See [Architecture - Auth](../architecture/auth.md).
- `admin` and `business` are separate, not a hierarchy. An operator account holding `admin` does not thereby get restaurant maintenance rights.
- **The dashboard names operations, not pages.** An operator picks the thing they came to do; nothing is a section of something larger. That is why the one migrations page became six entries with issue [#1473].
- **An operator sees private profiles, and `searchUsers` was not touched to allow it.** Account search filters `listUsersWithRoles`, which reads Firebase Auth joined with `/users` and is already admin-only, so the `public === true` filter in the consumer-facing `searchUsers` never applies to an operator and never had to be relaxed. The alternative — a flag on `searchUsers` that only an admin caller may set — would have put an operator-only branch inside the callable the consumer app depends on, and any change to what it returns touches the privacy nutrition label. This way the consumer callable is untouched and nothing an operator can do changes what one BiteTribe user can find out about another (issue [#1476]).
- **Reading accounts from Firebase Auth is also what makes every account findable.** An account that never completed profile creation has no `/users` document, so `searchUsers` cannot see it at all; the Auth-backed list shows it with whatever name Auth holds and a `null` tier. The display name is joined in from `/users` because that is the only place BiteTribe writes it — `claimDisplayName` writes `/users` and `/displayNames` and never the Auth record, so `UserRecord.displayName` is empty for every email/password account.
- **Blocking is Firebase Auth's `disabled` flag, and a live session survives it for up to an hour.** Firebase refuses a blocked account's sign-in and refuses to mint it a new token, but it cannot recall an ID token already issued. The operator surface says so on the form and in the confirmation rather than implying the block is instant. The full contract — what `revokeRefreshTokens` does and does not buy, why an operator cannot block themselves, and why they can block another operator — is on [Architecture - Auth](../architecture/auth.md).
- **Blocking and content removal are two actions, and the log shows two entries.** An operator who wants both does both. One action with hidden consequences is harder to reason about and harder to undo, and it is the same reason roles, tier and access save through three buttons rather than one.
- **The account list loads every page.** `listUsersWithRoles` pages at up to 1000 and returns a token; the client follows it, bounded at twenty pages. It used to take the first 200 and drop the token, which is survivable for a list to scroll and not survivable for a list to search: a search over a prefix answers "no such account" for an account that exists.
- **Removing a Bite is a delete, and the reason is what makes it auditable.** The Bite, its image in Storage, its reactions and its whole review thread are gone, and the stale id is dropped from every restaurant candidate, bucket list and BiteTrail that named it. Nothing is restorable and the author is not told, so `deleteBiteAsOperator` requires a short reason and refuses without one — Cloud Logging is the only record the action leaves, and the entry also keeps the Bite's name, its author and the Storage objects that were removed, because the Bite itself no longer holds them. The full contract, including why removing the reference from a bucket list and a BiteTrail is part of it, is on [Bite](../domain/bite.md).
- **Bite search is the consumer callable, limits included.** `searchBites` matches name and tags, needs three characters and returns at most twenty results. Those are consumer-facing choices, and changing them would change the consumer app's search, which issue [#1476] puts out of scope. The operator surface states both rather than hiding them: a term that is too short says so instead of showing an empty list, and a result set that fills the cap says it was capped. Searching Bites by id, by place or by author is not possible; nothing in the operator flow requires an id, but a report that carries only one cannot currently be resolved through this surface.
- The admin app is English-only. Its audience is BiteTribe Operators, and four locale lists kept in step for no reader is a cost with no reader.
- The app is `noindex, nofollow` at both the meta tag and the hosting header. It is an internal tool that must never appear in a search result.
- It shares the Firebase project with the other two apps, because it operates on the same Firestore, Auth and Functions. It has its own hosting site and its own `authDomain`.

## Success Criteria

- An account without `admin` cannot sign into the admin app, and the refusal is indistinguishable from a wrong password.
- An account without `business` cannot sign into the business app, on the same terms.
- A rejected sign-in leaves no session behind, so a deep link cannot skip the login page.
- A role granted through the backend takes effect in the client within one token refresh.
- An operator locked out of every admin account can recover through `grant-role.mjs` without an existing admin.

## Risk

The role gate is a lockout change, and the tool that grants roles is behind it. The bootstrap script is the recovery path and has to keep working after the gate is live; `setUserRoles` refusing to let an admin drop their own `admin` role is the cheaper half of the same protection.

Issue [#1078] replaced the Firestore rules, so this gate is no longer alone: a caller that goes around the admin app is now scoped by the account named on the document, and the `admin` role is a clause the rules read for themselves. Two things still hold. The gate stops an account from reaching a page and the rules stop it from writing a document, and they are independent — a change to one is not a change to the other. The rules themselves are live on merge: they deploy from CI on every push to `develop` since [#1567], so the gate is no longer a client-side gate over an open database. `storage.rules` is open regardless ([#1350]).

## Operational Notes

Bringing the app up needed three domain allowlists edited by hand that creating the Hosting site did not touch. See Adding A Web App To The Project in [Architecture - Firebase](../architecture/firebase.md) — that checklist exists because this app was silently unable to sign anyone in until all three were done.

The first `admin` role was granted through the Identity Toolkit REST API from Cloud Shell rather than through `grant-role.mjs`, because Cloud Shell already holds the caller's credentials and no service-account key has to be downloaded to a workstation. User credentials need an `x-goog-user-project` header there; without it the call fails with `SERVICE_DISABLED`.

## MVP Classification

**[MVP]** - the `admin` gate itself, and the two moderation surfaces: blocking an account
([#1474]) and removing an improper Bite ([#1475]). An app that publishes what its users write
cannot ship without someone able to take content down.

**[Secondary]** - the rest of the tooling: role and subscription-tier editing, restaurant
candidates and Bite places, restaurant ownership, Bite search as a lookup, and the migrations.
Each saves operator effort rather than being required for a first release.

## App Store Review Area

Relevant, and the gap is larger than this page. BiteTribe publishes user-generated content, and
Apple's user-generated-content guideline asks for four things: content filtering, timely
reporting, user-to-user blocking, and published contact details. Google Play has an equivalent
policy, and [Implementation - Store Declarations](../implementation/store-declarations.md) declares the **Social Media** data-use
category at a **13+** age rating.

**This page owns the operator half, and it ships**: an operator removes a Bite ([#1475]) and
blocks an account ([#1474]), with the contact address delivered by [#1429].

**The user-facing half does not exist**, and `RD-UR-7` classes the set `[MVP]`. Reporting,
user-to-user blocking and content filtering have no surface in the consumer app; each is owned
by an issue as of 14 September 2026 - [#1608] reporting a Bite, [#1609] blocking another user,
[#1610] filtering before publication. Epic [#1284] covers reporting inside a review thread only.
Not this page's behaviour, but this page is where the half that exists lives.

## Supported Evidence

- `libs/bite-tribe-admin/shell/src/lib/routes.ts` - every route behind `authGuard` and `roleGuard('admin')`: `dashboard`, `user-management`, `bite-search`, `restaurant-candidates`, `restaurant-ownership`, `bite-places`, `new-restaurant`, and the six migration routes.
- `roleGuard` in `libs/common/ta-firestore/src/lib/role.guard.ts`, the client-side backstop for a restored session or a revoked role.
- `requireAdmin` in `apps/bite-tribe-firebase/functions/src/functions/shared/roles.ts`, the server-side gate `listUsersWithRoles`, `setUserRoles`, `setUserBlocked`, `setUserSubscriptionTier`, `assignRestaurantOwner`, `revokeRestaurantOwner` and `deleteBiteAsOperator` all import.
- `apps/bite-tribe-firebase/scripts/grant-role.mjs`, the bootstrap script that grants the first `admin` role.
- `searchBites`, the same callable the consumer app's search drives.
- The six operational-migration routes and their callables are [UC - Run Operational Migrations](uc-run-operational-migrations.md)'s own evidence.

## Related GitHub Scope

- Epic [#1471] - grew the admin app into the BiteTribe operations tool; closed, with every issue
  under it complete
- Issue [#1469] - introduce the admin app, deploy it, and gate both privileged apps on roles
- Issue [#1473] - move the migrations and restaurant-candidate verification out of the business app
- Issue [#1472] - require the `admin` role on every operator callable, which moving the UI does not do; done, and the classification of every endpoint is now a test
- Issue [#1474] - block and unblock an account, the first operator action that takes something away
- Issue [#1475] - delete an improper Bite, and the cascade that keeps the derived state correct
- Issue [#1485] - see and change an account's subscription tier for a support case
- Issue [#1069] - stage 0 of [#735], restaurant ownership, claiming and authorization
- Issue [#1075] - business roles as verified identity
- Issue [#1077] - assign and revoke restaurant ownership, and the admin-app surface for it; done
- Issue [#1078] - ownership-scoped Firestore rules

## Related Domains

- [User](../domain/user.md)
- [Restaurant](../domain/restaurant.md)
- [Bite](../domain/bite.md)

## Related Pages

- [UC - Own And Claim Restaurants](uc-own-and-claim-restaurants.md)
- [UC - Verify Restaurant Candidate](uc-verify-restaurant-candidate.md)
- [UC - Run Operational Migrations](uc-run-operational-migrations.md)
- [User Roles](../product/user-roles.md)
- [Architecture - Auth](../architecture/auth.md)
- [Architecture - Nx Workspace](../architecture/nx-workspace.md)
- [Personas](../product/personas.md) - the audiences the `Actors` mapping displaced
- [Implementation - Store Declarations](../implementation/store-declarations.md)

[#735]: https://github.com/muhammedgaygisiz/travellers-apps/issues/735
[#1069]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1069
[#1075]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1075
[#1077]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1077
[#1078]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1078
[#1284]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1284
[#1350]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1350
[#1429]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1429
[#1469]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1469
[#1471]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1471
[#1472]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1472
[#1473]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1473
[#1474]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1474
[#1475]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1475
[#1476]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1476
[#1485]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1485
[#1567]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1567
[#1608]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1608
[#1609]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1609
[#1610]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1610
