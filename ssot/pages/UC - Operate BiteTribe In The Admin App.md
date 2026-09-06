# UC - Operate BiteTribe In The Admin App

## Status

Partially supported. The app exists, deploys, and is gated on the `admin` role as of issue \#1469. Role management, restaurant-candidate verification, the unmatched Bite places and the operational migrations are its surfaces today. Claim review moves into it in a follow-up.

## Goal

BiteTribe-internal operations live in an app only BiteTribe operators can sign into, separate from the app a restaurant maintains its own data in.

## Why It Is Needed

The privileged surface used to be one app. `bite-tribe-business` held both what a **restaurant** does to its own data and what **we** do to the platform, and the only check on it was "is signed in".

Two problems in one, both verified before issue \#1469:

- No separation. `migrations` and restaurant-candidate verification are BiteTribe-internal operations sitting in the app we intend to give restaurants. Any restaurant that logged in could run our migrations. Issue \#1473 moved both.
- No gate. `authGuard` asks whether a user is signed in, never who they are, and `apps/bite-tribe-firebase/firestore.rules` still grants read and write on every document to every authenticated user.

## Actors

- BiteTribe operator, holding the `admin` role
- Restaurant owner, holding the `business` role
- Signed-in user holding neither

## Target Flow

1. A restaurant calls BiteTribe and asks to claim a place.
2. The operator verifies the claim on the call, and optionally identifies the Bites that belong to that place.
3. In the admin app the operator creates the verified restaurant, sets its owner, and grants that owner the `business` role in one backend action.
4. The restaurant signs into the business app and maintains its own opening hours, menu, and profile.

Steps 3 and 4 are the point of the split: a restaurant never grants itself business access, and an operator never needs the business app to do operator work.

## Current Flow

1. An operator is granted `admin` through `grant-role.mjs`, run with service-account credentials.
2. They sign into the admin app with a normal BiteTribe account.
3. Sign-in verifies the `admin` role before it succeeds; an account without it gets the generic login failure. `roleGuard('admin')` backs that up on the routes for a restored session or a revoked role.
4. They land on the dashboard, a list of the operator surfaces the tool offers.
5. **User management** lists every BiteTribe account with the roles it holds, and grants or revokes them. It reads `listUsersWithRoles` and writes `setUserRoles`, both admin-only.

Only roles are editable. `setUserRoles` is the one admin write that exists, so the identity fields are read-only rather than offering a change nothing can save.

6. **Restaurant candidates** lists the pending candidates with the Bite evidence behind each, and **Bite places** lists place names Bites carry that no verified restaurant answers to yet. Both open the new-restaurant form, which creates the verified restaurant. Both moved out of the business dashboard with issue \#1473.
7. **The operational migrations** are one dashboard entry each — new version notification, review timestamps backfill, Bite address backfill, restaurant clustering, image migration, geohash migration. See [[UC - Run Operational Migrations]].

## Key Behaviours

- Roles are Firebase Auth custom claims, written only by the backend.
- **A missing role fails the login rather than blocking a page.** An account signed in and then refused would learn that its password was right, that it exists, and which role guards the app. The generic failure tells it nothing. See [[Architecture - Auth]].
- `admin` and `business` are separate, not a hierarchy. An operator account holding `admin` does not thereby get restaurant maintenance rights.
- **The dashboard names operations, not pages.** An operator picks the thing they came to do; nothing is a section of something larger. That is why the one migrations page became six entries with issue \#1473.
- The admin app is English-only. Its audience is BiteTribe operators, and four locale lists kept in step for no reader is a cost with no reader.
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

Until issue \#1078 replaces the Firestore rules, this is a client-side gate over an open database. It stops an account from reaching a page; it does not stop a determined caller from writing a document.

## Related GitHub Scope

- Epic \#1471 - grow the admin app into the BiteTribe operations tool, and the owner of everything below that is not yet built
- Issue \#1469 - introduce the admin app, deploy it, and gate both privileged apps on roles
- Issue \#1473 - move the migrations and restaurant-candidate verification out of the business app
- Issue \#1472 - require the `admin` role on every operator callable, which moving the UI does not do; done, and the classification of every endpoint is now a test
- Issue \#1069 - stage 0 of \#735, restaurant ownership, claiming and authorization
- Issue \#1075 - business roles as verified identity
- Issue \#1077 - claim review, approval and revocation workflow
- Issue \#1078 - ownership-scoped Firestore rules

## Related Domains

- [[User]]
- [[Restaurant]]

## Operational Notes

Bringing the app up needed three domain allowlists edited by hand that creating the Hosting site did not touch. See Adding A Web App To The Project in [[Architecture - Firebase]] — that checklist exists because this app was silently unable to sign anyone in until all three were done.

The first `admin` role was granted through the Identity Toolkit REST API from Cloud Shell rather than through `grant-role.mjs`, because Cloud Shell already holds the caller's credentials and no service-account key has to be downloaded to a workstation. User credentials need an `x-goog-user-project` header there; without it the call fails with `SERVICE_DISABLED`.

## Related Pages

- [[UC - Own And Claim Restaurants]]
- [[UC - Run Operational Migrations]]
- [[Architecture - Auth]]
- [[Architecture - Nx Workspace]]
