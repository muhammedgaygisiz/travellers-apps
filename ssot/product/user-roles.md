# User Roles

## Purpose

The binding definition of **who may do what** in BiteTribe. This page owns the
authorization vocabulary; other pages reference it rather than repeating it.

Three pages, three questions - do not merge them:

| Page                    | Answers                                                 |
| ----------------------- | ------------------------------------------------------- |
| **This page**           | _What may this account do?_ Roles, claims, capabilities |
| [Personas](personas.md) | _Who is this change for?_ Audiences, goals, needs       |
| [Glossary](glossary.md) | _What does this word mean?_ Domain terms                |

They do not map one to one, which is the reason for the split: five of the seven
personas have no distinct permission set, and two roles have no persona.

**Verified against the code on 7 September 2026**, branch `develop` at `d015d6fa`,
read-only. Decisions recorded after that reading are dated and are not re-verified.

## Roles

A role is a **Firebase Auth custom claim**, written only by the backend and carried in
the ID token. A client that lies about it changes nothing: every privileged callable
re-reads the claim from the verified token.

| Role (EN)              | Role (DE)              | Claim      | Definition                                                                                                                                                                                                                                                                                                          | Persona                                 |
| ---------------------- | ---------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| **BiteTribe Operator** | BiteTribe-Betreiber    | `admin`    | BiteTribe-internal superuser administering the entire application: verifies RestaurantCandidates, grants and revokes roles, assigns and revokes Restaurant ownership ([#1077]), runs the operational migrations. Required to sign into the Admin App.                                                               | _none_                                  |
| **Restaurant Owner**   | Restaurant-Inhaber     | `business` | The verified owner of one Restaurant, responsible for that Restaurant's own data: Menu, opening hours, address, description, image, social links. Required to sign into the Business App.                                                                                                                           | Restaurant owner or business maintainer |
| **Bite Creator**       | Bite-Ersteller         | _none_     | A registered user allowed to create a Bite. Carries **no** claim: in the code this role is the absence of a role _on a member session_, so it is neither grantable nor revocable. The second half is not decoration - an anonymous session also carries no claim, and is not a Bite Creator. See Table Guest below. | Bite creator                            |
| **Restaurant Staff**   | Restaurant-Mitarbeiter | `staff`    | A member of a restaurant's team, acting on the restaurants its Restaurant Owner holds. **Grantable since [#1537]**: the Restaurant Owner grants and revokes it for the restaurants it holds, not an Operator. What it may then _do_ is the service floor of those restaurants — see the matrix below.               | _none_                                  |

How they compose: **Bite Creator is the base every member account holds**, because the
consumer app has no role gate - only `authGuard`, which admits a member and refuses an
anonymous session (`getMember()`, not `getUser()`). Roles are additive rather than exclusive (one
account may hold `admin` and `business` at once), but holding one role does **not** imply
holding another: `admin` and `business` are deliberately not a hierarchy in the code.
`staff` is the exception to additivity - it _is_ the narrowed set, so holding it together
with `business` is contradictory and `setUserRoles` refuses the combination.

**Hierarchy in two senses, and only one of them holds.** In _capability_ the Operator is
above the Restaurant Owner: `RD-UR-6` gives it maintenance of every Restaurant, claimed or
not. In _claims_ it is not: `admin` does not confer `business`, an Operator never signs
into the Business App and never appears as a `Restaurant.ownerUserId`. The superset is
delivered by the Operator's own surfaces and an `admin` allowance in the rules, which is
what keeps the Business App owner-scoped (issue [#1079]) and the ownership record
truthful.

_Operator_ is the accepted short form in prose, matching
[UC - Operate BiteTribe In The Admin App](../use-cases/uc-operate-bitetribe-in-the-admin-app.md); the other two are used in full.

Ownership is **written, enforced and visible**. `Restaurant.ownerUserId` and `claimStatus` got an
operator writer in [#1077] (`assignRestaurantOwner`, `revokeRestaurantOwner`), `firestore.rules` began
reading it in [#1078], and [#1079] scoped the business dashboard and its edit routes to it.
Since [#1537] the same field decides which restaurant's staff an account may change. Two
caveats: the rules deploy by hand, so they bind only once
`npx nx firebase-deploy-rules bite-tribe-firebase` has run, and nothing in production is
assigned today. There is **no self-service claim** - [#1076] was closed as not planned and
[#1077] removed the `RestaurantClaim` model with it. See [UC - Own And Claim Restaurants](../use-cases/uc-own-and-claim-restaurants.md).

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
| Act on a report: block an account, delete a Bite                                            | yes ⁵                     | no               | no                       |

¹ `RD-UR-6`: the Operator maintains **every** Restaurant, claimed or unclaimed, from the
Admin App - where verification already creates them - and never through the Business App,
which requires `business` and is owner-scoped since [#1079]. [#1078] delivered the rules half:
`admin` is an explicit clause rather than an implied `business`, carried in the suite as its
own allow case alongside epic [#1069]'s deny case for a business account writing a restaurant it
does not hold. **The maintenance surface itself does not exist and no issue owns it**, so a
Restaurant is today maintainable by nobody once created - the Operator corrects data during
verification, or edits in the Firebase console. The remaining gap is attributability: an
operator write from the admin app lands as a plain client write and leaves nothing in the
operator log, unlike the ownership callables. That half of [#1164] is [#1546], open. Supersedes
the three-way hierarchy question in [UC - Verify Restaurant Candidate](../use-cases/uc-verify-restaurant-candidate.md) `S-10` and [#1164].

² Assigned, enforced and visible per the ownership note above. One consequence worth naming:
the write is authorised by ownership alone rather than by ownership _and_ the `business` role,
so an account whose role was revoked while it still held a restaurant keeps write access
through the API. [#1539] removes that state at the source.

³ `RD-UR-4`, final in keeping BiteTrail creation out of the Business App and otherwise not yet final ([#1615]): publishing moves to the consumer app behind `authGuard` only, so it becomes a
Bite Creator capability and the Business App route is retired. Implementation is issue
[#1519], sequenced behind content reporting - see footnote ⁵. `RD-UR-5` covers launch content
without code.

⁴ Set when the creator picks a verified nearby Restaurant, on create **and** on edit.
This puts the Bite Creator behind two of the four writers of that field, the create and
the edit path; see
[UC - Verify Restaurant Candidate](../use-cases/uc-verify-restaurant-candidate.md), rule `R-8`.

⁵ `RD-UR-7` fixes the required set and classes it `[MVP]`. Bite Creator carrying no claim
means there is no grant to revoke either. **The operator half shipped**: block an account
([#1474]) and delete a Bite ([#1475]) with epic [#1471], the contact address with [#1429];
the report queue is epic [#1284], open. **The user-facing half - reporting, user-to-user
blocking, content filtering - does not exist**, and each part has had an owning issue since
14 September 2026: [#1608] reporting a Bite, [#1609] blocking another user, [#1610] filtering
before publication. Epic [#1284] is narrower than it looks - it moderates review threads, so it
covers reporting inside a thread and nothing else. Store requirement
rather than product polish:
[Implementation - Store Declarations](../implementation/store-declarations.md) declares the **Social Media** data-use category
at a **13+** age rating, and Apple's user-generated-content guideline asks for filtering,
timely reporting, blocking and published contact details, with an equivalent Google Play
policy.

⁶ Issue [#1537]. The Restaurant Owner is authorised by `Restaurant.ownerUserId` rather than
by holding `business`, so the role alone reaches no restaurant. The Operator is authorised
by `RD-UR-6` and reaches every one, which is the way back when a Restaurant removes its
last account with access. Neither can grant `admin` or `business` through these callables,
and neither can act on an account that holds one.

**What the stores have done about footnote ⁵, checked 8 September 2026 against public data
only.** Google Play published the build with none of the four safeguards present, so Play
raised no objection. Apple's position is unread - it lives in App Store Connect, and the iOS
app not being findable is consistent with awaiting review rather than evidence of rejection.
[Current State - Release State](../current-state/release-state.md) owns the release position itself.

**The gates above are route guards and callable checks; since [#1078] the data layer backs
them too.** `firestore.rules` scopes every **write** by the account named on the document;
most **reads** it does not, and `bites` still allows read to any signed-in account. The
ruleset is live - confirmed in the Firebase console on 11 September 2026, ending in a
default-deny. `storage.rules` is untouched and still open ([#1350]), and nothing in CI deploys
either ruleset ([#1567]). The detail is owned by [Current State - Known Issues](../current-state/known-issues.md).

## Not roles

| Concept                       | What it actually is                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Food lover                    | A subset of Bite Creator's permissions. There is no read-only role - any authenticated account may create                                                                                                                                                                                                                                                                               |
| Traveler                      | A subset of Food lover                                                                                                                                                                                                                                                                                                                                                                  |
| New user                      | A lifecycle state (`onboardingCompletedAt`, `onboardingVersion`), not a permission                                                                                                                                                                                                                                                                                                      |
| Privacy-conscious participant | A settings choice (`PublicUser.public`), not a permission                                                                                                                                                                                                                                                                                                                               |
| **Public / Private Profile**  | The same visibility choice, not a capability                                                                                                                                                                                                                                                                                                                                            |
| **BiteTribe Pro**             | An entitlement on `PublicUser.subscriptionTier`: `0` = Free, `>= 1` = Pro. Orthogonal to every role. No purchase path exists. See [Subscription](../domain/subscription.md)                                                                                                                                                                                                             |
| **BiteTrail Creator**         | An activity of the _Food curator or vlogger_ persona, not a permission. Publishing a BiteTrail becomes a Bite Creator capability under `RD-UR-4`, tracked by issue [#1519]; the proposed `curator` claim is retired. `RD-UR-4` is final only in keeping BiteTrail creation out of the Business App; issue [#1615] settles the rest                                                      |
| **Moderator**                 | Does not exist. There is no moderation role: content reports are acted on by the Operator under `RD-UR-7`. Stated here rather than in [Glossary](glossary.md), which carries the terms the product _has_                                                                                                                                                                                |
| **Table Guest**               | An **anonymous Firebase Auth session**, not a role: it carries no claim, nothing grants or revokes it, and `createUserOnAuthCreate` skips it so it leaves no `/users` document. It is an authentication state, and the table screens are the only place that mints one - and only when nobody is signed in, since a member who scans a table code stays themselves. See the table below |
| **Unauthenticated visitor**   | Reaches the open routes and nothing else: the privacy policy, the account-deletion notice, support, a scanned table code and the order screen behind it, and a published menu                                                                                                                                                                                                           |
| **The backend itself**        | Cloud Functions act with admin credentials and no role. It is the actual writer in most flows, which is why the open Firestore rules matter - see the note above the table                                                                                                                                                                                                              |

The first four are personas: audiences, not authorization concepts, and they must not
become roles.

**Three categories, and the test between them is mechanical.** A **persona** carries no
authorization: remove it and nothing an account may do changes. A **role** is a custom
claim: it gates surfaces and callables, and it is grantable and revocable. An
**entitlement** is a server-owned record of what an account is allowed: it gates features
rather than surfaces, is orthogonal to every role, and is not written by `setUserRoles`.
BiteTribe Pro is the entitlement - which is why it sits in the table above without being a
persona either. See `RD-UR-1`.

**A fourth thing the three categories do not cover, checked 16 September 2026: the kind of
session.** The table guest of issues [#1101] to [#1108] is not a persona, because removing it
changes what the table callables admit; not a role, because it carries no claim and nothing
grants or revokes it; and not an entitlement, because nothing is recorded about it anywhere.
It is the session's own kind - anonymous or member - and the two layers read it differently.
`authGuard` asks `getMember()` rather than `getUser()`, so an anonymous session opens no
authenticated route: without that distinction a guest who scanned a table would be handed the
feed, the gallery and a profile page with nobody behind it. `firestore.rules` asks only
`signedIn()` and then matches the document against the caller's own uid, which is what the
anonymity actually buys - a stable identity to name a session after, upgraded in place by
`linkWith*` if the guest later registers.

| Capability                                                       | Table Guest                     |
| ---------------------------------------------------------------- | ------------------------------- |
| Resolve a scanned table code, read the menu behind it            | yes, **without any session** ¹¹ |
| Start or leave a table session                                   | yes, own session ¹²             |
| Send an order, ask for a waiter or the bill                      | yes, own session ¹²             |
| Read back its own session, orders and assistance requests        | yes, own uid only ¹³            |
| Read another party's session, orders or the room's state         | no ¹³                           |
| Every authenticated route: feed, gallery, profile, Bite creation | no ¹⁴                           |

¹¹ `resolveTableQrToken` and `loadPublicMenu` are the two `public` callables of the flow
([#1100], [#1102]), reachable with no session at all. Both assemble their answer field by
field rather than handing back the documents they read, because the restaurant document
carries ownership and ordering configuration a reader is not entitled to.

¹² `startTableSession`, `leaveTableSession`, `submitTableOrder` and `requestTableAssistance`
are the four callables written for an anonymous session. None of them takes a `guestUserId`:
each writes against the one session named after the caller's own uid, and the restaurant,
table and visit all come off a scanned token. **Four by design and not by enforcement**, and
the distinction matters: `classifyCallable`'s `authenticated` means "carries a uid", nothing
more, and `start-table-session.ts` reading `sign_in_provider === 'anonymous'` is the only
place in the backend that looks at the kind of session at all - and it records the answer on
the session rather than refusing anything with it. So an anonymous token reaches every other
`authenticated` callable too, `searchUsers` and `loadBitesByLocation` among them.
`callable-authorization.spec.ts` asserts the role guards and does not assert this, so nothing
would catch a fifth callable quietly joining the list.

¹³ The documents are `allow write: if false` throughout; the guest's read clauses match
`guestUserId == uid()` on `tableSessions` and `orders`, and `requestedByUserIds` on
`assistanceRequests`. `list` on a session or an assistance request is `readsFloorPlan` only,
so a guest reads its own documents and cannot enumerate the room.

¹⁴ The **routes** refuse it - `authGuard` turns an anonymous session away, and the table
routes sit outside `gateAuthenticatedRoutes` as well, so a guest who never signed up is not
asked to finish an onboarding they never started. The callables behind those routes do not
refuse it, per footnote ¹².

**The upgrade the design rests on does not exist yet.** Both `auth.service.ts` and
`start-table-session.ts` explain the anonymous uid as the thing `linkWith*` later upgrades in
place, so that a guest who registers keeps the session that knows what they ordered.
`linkWith` appears nowhere in the workspace but in those two comments. A guest who signs up
today therefore gets a second account with a second uid, and the session, the orders and the
visit stay with the first - which is also why the anonymous record leaves no `/users`
document behind it: `createUserOnAuthCreate` is a `beforeUserCreated` blocking trigger, so it
fires for a sign-up and would not fire for a link even once linking exists.

**It bites only the guest who arrived with no account.** `signInAsGuest` returns the existing
user rather than signing in again, so a member who scans a table code holds their own uid
throughout and never meets the link at all. The window is between an anonymous scan and the
end of that meal, which is exactly the window issue [#1112] wants to use for a Bite. Issues
[#1657] and [#1658] own it: the link itself, and the move for a guest who signs into an
account they already had, whom Firebase refuses to link.

**Restaurant Staff has a column, as of [#1097].** It had none for as long as its permission
set was undecided (`RD-UR-8`), because a column of guesses would state a boundary nobody had
taken. The set below is decided, enforced and under test; what was fixed from the start, and
still is, is that staff acts on the restaurants its granting Restaurant Owner holds and on no
others.

| Capability                                                    | Restaurant Staff       |
| ------------------------------------------------------------- | ---------------------- |
| Consumer app: create and edit own Bites, browse, search, etc. | yes                    |
| Sign into the Business App                                    | yes ⁷                  |
| Read the **published** floor plan                             | yes, own restaurant ⁸  |
| Read the owner's unpublished floor-plan draft                 | no ⁸                   |
| Read live table state, the audit trail and visits             | yes, own restaurant    |
| Change live table state, open and close visits                | yes, own restaurant ⁹  |
| Read the table sessions, orders and assistance signals        | yes, own restaurant ¹⁰ |
| Move an order along its lifecycle, clear an assistance signal | yes, own restaurant ¹⁰ |
| Edit the floor plan, or print its QR codes                    | no                     |
| Maintain the restaurant profile, menu, hours, address, links  | no                     |
| Grant or revoke `staff`, or see the staff list                | no                     |
| Create and publish a BiteTrail                                | no                     |

⁷ And lands in the room it works at rather than on the owner dashboard ([#1097]):
`staffEntryGuard` reads `/restaurantStaff/{uid}` on `/dashboard` and redirects to
`restaurant/{restaurantId}/tables`. The dashboard lists restaurants by
`Restaurant.ownerUserId`, so without the redirect a staff account arrives at an empty page and
the surfaces its role has are reachable only by typing a URL.

⁸ The split is what made the read safe to open at all ([#1088]). The published arrangement is
the room document and the table documents; the owner's half-finished one lives at
`rooms/{roomId}/drafts/current`, which has no staff clause. Scoped by `worksAt()` - the claim
**and** the association naming that restaurant - never by the `staff` role alone, which would
make the role a key to every restaurant's interior in BiteTribe.

⁹ Not through `firestore.rules`: every client write to `tableStates`,
`tableStateTransitions` and `visits` is refused, and the change is made by calling
`transitionTableState` or `moveTableVisit` ([#1092], [#1095]). A callable rather than a rule
because two hosts seating one table at the same second has to resolve to one outcome.

¹⁰ The pass beside the room ([#1105], [#1106]). The reads follow the same `readsFloorPlan` as
the tables, their live state and the visits, because two lists of readers for one dining room
would drift apart; the restaurant-wide queue is a collection-group `list` on `orders` that the
query must prove with `where('restaurantId', '==', ...)`, and
`restaurant/:restaurantId/orders` is the second route in the business app a staff account is
meant to reach. The writes are callables again - `transitionTableOrderStatus` and
`acknowledgeTableAssistance`, classified `staffAuthority` beside the two in footnote ⁹ - and
the documents stay `allow write: if false`, because a client able to write an order could
rewrite its lines after the guest agreed to them.

**Revocation is immediate at the data layer, and lags by up to an hour in the app.**
`removeRestaurantStaff` drops the claim and deletes the association together, and every rule
above requires both, so the deleted association ends the access even while the account's
unrefreshed ID token still carries `staff`. What the token's remaining life still costs is the
sign-out: the account keeps the app open, reading nothing, until `roleGuard` sees a refreshed
token without the claim. The rules suite covers both halves.

**The set arrived one issue at a time, and the dashboard was never part of it.** [#1537]
shipped the grant rather than the permission on 10 September 2026, so for a day a staff
account could sign in and do nothing. [#1088] gave the role its first read, [#1092] its first
write, [#1093] and [#1094] the room and the actions, [#1097] the entry that leads to them, and
[#1105] and [#1106] the order queue and the assistance signals. Throughout, the dashboard has
scoped by `Restaurant.ownerUserId` and listed a staff account nothing: the fix was never to
widen that list but to stop sending the account to it.

## Recorded Decisions

The decisions binding this page are `RD-UR-1` to `RD-UR-8`. They are held in
[Recorded Decisions](../decisions/recorded-decisions.md) with every other decision in the graph.

## Related Pages

- [User](../domain/user.md)
- [Personas](personas.md)
- [Glossary](glossary.md)
- [UC - Operate BiteTribe In The Admin App](../use-cases/uc-operate-bitetribe-in-the-admin-app.md)
- [UC - Verify Restaurant Candidate](../use-cases/uc-verify-restaurant-candidate.md)
- [UC - Own And Claim Restaurants](../use-cases/uc-own-and-claim-restaurants.md)
- [Architecture - Auth](../architecture/auth.md)
- [Implementation - Store Declarations](../implementation/store-declarations.md)
- [Current State - Known Issues](../current-state/known-issues.md)
- [Current State - Open Questions](../current-state/open-questions.md)
- [Current State - Release State](../current-state/release-state.md)

[#1069]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1069
[#1076]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1076
[#1077]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1077
[#1078]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1078
[#1079]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1079
[#1088]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1088
[#1092]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1092
[#1093]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1093
[#1094]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1094
[#1095]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1095
[#1097]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1097
[#1100]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1100
[#1101]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1101
[#1102]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1102
[#1105]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1105
[#1106]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1106
[#1108]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1108
[#1164]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1164
[#1284]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1284
[#1350]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1350
[#1429]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1429
[#1471]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1471
[#1474]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1474
[#1475]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1475
[#1519]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1519
[#1537]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1537
[#1539]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1539
[#1546]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1546
[#1567]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1567
[#1608]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1608
[#1609]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1609
[#1610]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1610
[#1615]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1615
[#1112]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1112
[#1657]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1657
[#1658]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1658
