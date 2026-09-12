# User Roles

## Purpose

The binding definition of **who may do what** in BiteTribe. This page owns the
authorization vocabulary; other pages reference it rather than repeating it.

Three pages, three questions - do not merge them:

| Page          | Answers                                                 |
| ------------- | ------------------------------------------------------- |
| **This page** | _What may this account do?_ Roles, claims, capabilities |
| [[Personas]]  | _Who is this change for?_ Audiences, goals, needs       |
| [[Glossary]]  | _What does this word mean?_ Domain terms                |

They do not map one to one, which is the reason for the split: five of the seven
personas have no distinct permission set, and two roles have no persona.

**Verified against the code on 7 September 2026**, branch `develop` at `d015d6fa`,
read-only. Decisions recorded after that reading are dated and are not re-verified.

This page carries facts and decisions.

## Roles

A role is a **Firebase Auth custom claim**, written only by the backend and carried in
the ID token. A client that lies about it changes nothing: every privileged callable
re-reads the claim from the verified token.

| Role (EN)              | Role (DE)              | Claim      | Definition                                                                                                                                                                                                                                                                           | Persona                                 |
| ---------------------- | ---------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| **BiteTribe Operator** | BiteTribe-Betreiber    | `admin`    | BiteTribe-internal superuser administering the entire application: verifies RestaurantCandidates, grants and revokes roles, assigns and revokes Restaurant ownership (\#1077), runs the operational migrations. Required to sign into the Admin App.                                 | _none_                                  |
| **Restaurant Owner**   | Restaurant-Inhaber     | `business` | The verified owner of one Restaurant, responsible for that Restaurant's own data: Menu, opening hours, address, description, image, social links. Required to sign into the Business App.                                                                                            | Restaurant owner or business maintainer |
| **Bite Creator**       | Bite-Ersteller         | _none_     | A registered user allowed to create a Bite. Carries **no** claim: in the code this role is the _absence_ of a role, so it is neither grantable nor revocable.                                                                                                                        | Bite creator                            |
| **Restaurant Staff**   | Restaurant-Mitarbeiter | `staff`    | A member of a restaurant's team, acting on the restaurants its Restaurant Owner holds. **Grantable since \#1537**: the Restaurant Owner grants and revokes it for the restaurants it holds, not an Operator. What it may then _do_ is still nothing — see the note below the matrix. | _none_                                  |

How they compose: **Bite Creator is the base every account holds**, because the consumer
app has no role gate - only `authGuard`. Roles are additive rather than exclusive (one
account may hold `admin` and `business` at once), but holding one role does **not** imply
holding another: `admin` and `business` are deliberately not a hierarchy in the code.
`staff` is the exception to additivity - it _is_ the narrowed set, so holding it together
with `business` is contradictory and `setUserRoles` refuses the combination.

**Hierarchy in two senses, and only one of them holds.** In _capability_ the Operator is
above the Restaurant Owner: `RD-UR-6` gives it maintenance of every Restaurant, claimed or
not. In _claims_ it is not: `admin` does not confer `business`, an Operator never signs
into the Business App and never appears as a `Restaurant.ownerUserId`. The superset is
delivered by the Operator's own surfaces and an `admin` allowance in the rules, which is
what keeps the Business App owner-scoped (issue \#1079) and the ownership record
truthful.

_Operator_ is the accepted short form in prose, matching
[[UC - Operate BiteTribe In The Admin App]]; the other two are used in full.

Ownership is **written, enforced and visible**: \#1077 gave
`Restaurant.ownerUserId` and `claimStatus` an operator writer - `assignRestaurantOwner`
and `revokeRestaurantOwner`, behind an admin-app surface - \#1078 made
`firestore.rules` read the field, so an assignment grants and withholds writes rather
than only recording accountability, and \#1079 scoped the business dashboard and its edit
routes to it. Since \#1537 the field authorises a third thing: which restaurant's staff an
account may change. One caveat: the rules deploy by hand and are live
only once `npx nx firebase-deploy-rules bite-tribe-firebase` has run.
Nothing in production is assigned today. There is **no self-service claim** - \#1076 was closed as not planned and
\#1077 removed the `RestaurantClaim` model with it. See
[[UC - Own And Claim Restaurants]].

## What each role may do

Granted today: yes. Target state, not implemented: **target**. Not granted: no.

| Capability                                                                                  | Operator                  | Restaurant Owner | Bite Creator             |
| ------------------------------------------------------------------------------------------- | ------------------------- | ---------------- | ------------------------ |
| Consumer app: create and edit own Bites, browse, search, bucket lists, follow, like, review | yes                       | yes              | yes                      |
| Sign into the Admin App                                                                     | yes                       | no               | no                       |
| Sign into the Business App                                                                  | no ¹                      | yes              | no                       |
| Verify a RestaurantCandidate                                                                | yes                       | no               | no                       |
| Grant and revoke roles                                                                      | yes                       | no               | no                       |
| Grant and revoke `staff` on a Restaurant                                                    | yes, any Restaurant ⁶     | yes, own only ⁶  | no                       |
| Run the operational migrations                                                              | yes                       | no               | no                       |
| Cluster a Bite into a Candidate on demand                                                   | yes                       | no               | no                       |
| Maintain a Restaurant's menu, hours, address, links                                         | **target**, all of them ¹ | yes, own only ²  | no                       |
| **Create and publish a BiteTrail**                                                          | no                        | yes, today ³     | **target** ³             |
| Acquire a BiteTrail as a Bucketlist                                                         | yes                       | yes              | yes                      |
| Write `bite.restaurantId`                                                                   | yes, via verification     | no               | yes, via the Bite form ⁴ |
| Report content and block another user                                                       | **target** ⁵              | **target** ⁵     | **target** ⁵             |
| Act on a report: block an account, delete a Bite                                            | **target** ⁵              | no               | no                       |

¹ `RD-UR-6`: the Operator maintains **every** Restaurant, claimed or unclaimed, from the
Admin App - where verification already creates them. It does not reach them through the
Business App, which requires `business` and is owner-scoped since issue \#1079. **The
surface does not exist yet**, so today a Restaurant is maintainable by nobody once
created: the Operator's only control is correcting the data during verification, and a
Firebase console edit afterwards. No issue owns the surface. Two consequences elsewhere -
the ownership-scoped rules in issue \#1078 need an explicit `admin` allowance, and epic
\#1069's success criterion _"a restaurant cannot be edited by a user who does not own
it"_ needs that exception written into its deny tests. Supersedes the three-way hierarchy
question in [[UC - Verify Restaurant Candidate]] `S-10` and issue \#1164.

**Both are delivered as of \#1078.** The rules name `admin` as an explicit clause rather
than implying `business`, and the rules suite carries the exception as its own allow case
alongside the deny case for a business account writing a restaurant it does not hold. The
gap that remains is attributability: an operator write from the admin app lands as a plain
client write and leaves nothing in the operator log, unlike the ownership callables. That
is the half of \#1164 no issue owns yet.

² Assigned since \#1077, enforced since \#1078 and visible since \#1079:
`firestore.rules` allows a restaurant, menu or Bite-trail write only from the account
named on the document, the business dashboard lists only the restaurants assigned to the
caller, and the two routes that edit one refuse anything else by direct URL. The write is
authorised by ownership alone rather than by ownership _and_ the `business` role, so an
account whose role was revoked while it still held a restaurant keeps write access through
the API; \#1539 removes that state at the source.

³ `RD-UR-4`: publishing moves to the consumer app behind `authGuard` only, so it becomes a
Bite Creator capability and the Business App route is retired. Implementation is issue
\#1519, sequenced behind content reporting - see footnote ⁵. `RD-UR-5` covers launch content
without code.

⁴ Set when the creator picks a verified nearby Restaurant, on create **and** on edit.
This makes the Bite Creator one of three writers of that field; see
[[UC - Verify Restaurant Candidate]], rule `R-8`.

⁵ Nothing here exists in the product today, and Bite Creator carrying no claim means
there is no grant to revoke either. `RD-UR-7` fixes the required set and classes it `[MVP]`.
Operator actions are issues \#1474 (block an account) and \#1475 (delete a Bite),
children of epic \#1471; the report queue is epic \#1284. **The user-facing report
action, user-to-user blocking and content filtering have no owning issue**, and the
contact address waits on \#1429. Store requirement rather than product polish:
[[Implementation - Store Declarations]] declares the **Social Media** data-use category
at a **13+** age rating, and Apple's user-generated-content guideline asks for filtering,
timely reporting, blocking and published contact details, with an equivalent Google Play
policy.

⁶ Issue \#1537. The Restaurant Owner is authorised by `Restaurant.ownerUserId` rather than
by holding `business`, so the role alone reaches no restaurant. The Operator is authorised
by `RD-UR-6` and reaches every one, which is the way back when a Restaurant removes its
last account with access. Neither can grant `admin` or `business` through these callables,
and neither can act on an account that holds one.

**Store position, checked 8 September 2026 against public store data only.** Google Play
**has published the build**: the listing is live with an install button, last updated
31 August 2026, rated 12+ on Play's own scale. So Play raised no objection to shipping
with none of the four safeguards present. The iOS app is **not findable** by bundle id
`com.bitetribe.app` on either the US or the Swiss storefront, which is consistent with
[[Current State - Release State]] recording it as awaiting review on 31 August and is
**not** evidence of a rejection. Apple's actual position is still unread - it is in App
Store Connect, not in public data.

**Every gate above is a route guard or a callable check, not a data-layer one.**
`firestore.rules` grants read and write on every document to every authenticated user, so
a role gate stops an account reaching a page rather than stopping a determined caller
writing a document. Accepted as a documented launch risk on 19 August 2026 under issue
\#1177; owned by [[Current State - Known Issues]], with \#1078 for Firestore and \#1350
for Storage, the more exploitable of the two.

## Not roles

| Concept                       | What it actually is                                                                                                                                                                                                |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Food lover                    | A subset of Bite Creator's permissions. There is no read-only role - any authenticated account may create                                                                                                          |
| Traveler                      | A subset of Food lover                                                                                                                                                                                             |
| New user                      | A lifecycle state (`onboardingCompletedAt`, `onboardingVersion`), not a permission                                                                                                                                 |
| Privacy-conscious participant | A settings choice (`PublicUser.public`), not a permission                                                                                                                                                          |
| **Public / Private Profile**  | The same visibility choice, not a capability                                                                                                                                                                       |
| **BiteTribe Pro**             | An entitlement on `PublicUser.subscriptionTier`: `0` = Free, `>= 1` = Pro. Orthogonal to every role. No purchase path exists. See [[Subscription]]                                                                 |
| **BiteTrail Creator**         | An activity of the _Food curator or vlogger_ persona, not a permission. Publishing a BiteTrail becomes a Bite Creator capability under `RD-UR-4`, tracked by issue \#1519; the proposed `curator` claim is retired |
| **Moderator**                 | Does not exist. There is no moderation role: content reports are acted on by the Operator under `RD-UR-7`. Stated here rather than in [[Glossary]], which carries the terms the product _has_                      |
| **Unauthenticated visitor**   | Reaches only `start` and the auth routes                                                                                                                                                                           |
| **The backend itself**        | Cloud Functions act with admin credentials and no role. It is the actual writer in most flows, which is why the open Firestore rules matter - see the note above the table                                         |

The first four are personas: audiences, not authorization concepts, and they must not
become roles.

**Three categories, and the test between them is mechanical.** A **persona** carries no
authorization: remove it and nothing an account may do changes. A **role** is a custom
claim: it gates surfaces and callables, and it is grantable and revocable. An
**entitlement** is a server-owned record of what an account is allowed: it gates features
rather than surfaces, is orthogonal to every role, and is not written by `setUserRoles`.
BiteTribe Pro is the entitlement - which is why it sits in the table above without being a
persona either. See `RD-UR-1`.

**Restaurant Staff has no column in the matrix above, deliberately.** The role is decided
(`RD-UR-8`) and grantable (\#1537); its permission set is not. A column of guesses would
state a boundary nobody has decided. What is fixed: staff acts on the restaurants its
granting Restaurant Owner holds and on no others.

**Checked 10 September 2026: a staff account can do nothing yet, and that is what \#1537
shipped.** The issue's own scope was the grant, not the permission — "this makes the role
and the association writable by the right caller, not meaningful". So today a Restaurant
Owner can put an account on a restaurant, the `staff` claim and the
`/restaurantStaff/{uid}` record are written together and audited, `firestore.rules`
protects the record, and the account can sign into the Business App — where the dashboard
lists restaurants by `Restaurant.ownerUserId` (\#1079) and therefore shows it nothing, and
the rules give it no write (\#1078).

**Updated 12 September 2026: the role has a permission, and no screen.** \#1088 gave
`staff` its first read — the published floor plan of the one restaurant it works at, never
a plan of any restaurant, because `worksAt()` pairs the claim with the association naming
that restaurant. \#1092 gave it its first write, and deliberately not through the rules: a
staff account changes a table's live state by calling `transitionTableState`, which admits
`staff`, `business` or `admin` and then decides which restaurant each of them reaches.
Live state is written by a callable rather than by a client because two hosts seating one
table at once has to resolve to one outcome. \#1093 and \#1094 then gave the role its
surface: `restaurant/:restaurantId/tables` draws the room a staff account works in, and
holding a table opens the transitions it is allowed to make. So the write the role was
granted is now one a staff member can actually reach - and it is still the only one, since
the floor plan, the QR codes and the staff list remain closed to it. What a staff account
signing in today still lands on is a dashboard that lists nothing, because the dashboard
scopes by `Restaurant.ownerUserId`; that scoping has no owning issue.

## Recorded Decisions

The decisions binding this page are `RD-UR-1` to `RD-UR-7`. They are held in
[[Recorded Decisions]] with every other decision in the graph.

## Related Pages

- [[User]]
- [[Personas]]
- [[Glossary]]
- [[UC - Operate BiteTribe In The Admin App]]
- [[UC - Verify Restaurant Candidate]]
- [[UC - Own And Claim Restaurants]]
- [[Architecture - Auth]]
- [[Implementation - Store Declarations]]
- [[Current State - Known Issues]]
- [[Current State - Open Questions]]
- [[Current State - Release State]]
