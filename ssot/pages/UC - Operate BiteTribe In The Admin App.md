# UC - Operate BiteTribe In The Admin App

## Status

Partially supported. The app exists, deploys, and is gated on the `admin` role as of issue \#1469. It carries no operator surface yet: claim review, restaurant-candidate verification and role management move into it in follow-ups.

## Goal

BiteTribe-internal operations live in an app only BiteTribe operators can sign into, separate from the app a restaurant maintains its own data in.

## Why It Is Needed

The privileged surface used to be one app. `bite-tribe-business` held both what a **restaurant** does to its own data and what **we** do to the platform, and the only check on it was "is signed in".

Two problems in one, both verified before issue \#1469:

- No separation. `migrations` and restaurant-candidate verification are BiteTribe-internal operations sitting in the app we intend to give restaurants. Any restaurant that logged in could run our migrations.
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
3. `roleGuard('admin')` admits them to the dashboard, which shows the signed-in account and nothing else yet.
4. Restaurant-candidate verification and migrations still run in the business app, behind `roleGuard('business')`.

## Key Behaviours

- Roles are Firebase Auth custom claims, written only by the backend.
- `admin` and `business` are separate, not a hierarchy. An operator account holding `admin` does not thereby get restaurant maintenance rights.
- The admin app is English-only. Its audience is BiteTribe operators, and four locale lists kept in step for no reader is a cost with no reader.
- The app is `noindex, nofollow` at both the meta tag and the hosting header. It is an internal tool that must never appear in a search result.
- It shares the Firebase project with the other two apps, because it operates on the same Firestore, Auth and Functions. It has its own hosting site and its own `authDomain`.

## Success Criteria

- A signed-in account without `admin` cannot reach an admin route and is told which role it lacks.
- A signed-in account without `business` cannot reach a business route.
- A role granted through the backend takes effect in the client within one token refresh.
- An operator locked out of every admin account can recover through `grant-role.mjs` without an existing admin.

## Risk

The role gate is a lockout change, and the tool that grants roles is behind it. The bootstrap script is the recovery path and has to keep working after the gate is live; `setUserRoles` refusing to let an admin drop their own `admin` role is the cheaper half of the same protection.

Until issue \#1078 replaces the Firestore rules, this is a client-side gate over an open database. It stops an account from reaching a page; it does not stop a determined caller from writing a document.

## Related GitHub Scope

- Issue \#1469 - introduce the admin app, deploy it, and gate both privileged apps on roles
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
