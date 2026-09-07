# User Roles

## Purpose

The binding definition of **who may do what** in BiteTribe. This page owns the
authorization vocabulary; other pages reference it rather than repeating it.

Three pages, three questions - do not merge them:

| Page | Answers |
|---|---|
| **This page** | *What may this account do?* Roles, claims, capabilities |
| [[Personas]] | *Who is this change for?* Audiences, goals, needs |
| [[Glossary]] | *What does this word mean?* Domain terms |

They do not map one to one, which is the reason for the split: five of the seven
personas have no distinct permission set, and one role has no persona.

**Verified against the code on 7 September 2026**, branch `develop` at `d015d6fa`,
read-only. Decisions recorded after that reading are dated and are not re-verified.

## Roles

A role is a **Firebase Auth custom claim**, written only by the backend and carried in
the ID token. A client that lies about it changes nothing: every privileged callable
re-reads the claim from the verified token.

| Role (EN) | Role (DE) | Claim | Definition | Persona |
|---|---|---|---|---|
| **BiteTribe Operator** | BiteTribe-Betreiber | `admin` | BiteTribe-internal superuser administering the entire application: verifies RestaurantCandidates, grants and revokes roles, runs the operational migrations and - planned - reviews RestaurantClaims. Required to sign into the Admin App. | *none* |
| **Restaurant Owner** | Restaurant-Inhaber | `business` | The verified owner of one Restaurant, responsible for that Restaurant's own data: Menu, opening hours, address, description, image, social links. Required to sign into the Business App. | Restaurant owner or business maintainer |
| **Bite Creator** | Bite-Ersteller | *none* | A registered user allowed to create a Bite. Carries **no** claim: in the code this role is the *absence* of a role, so it is neither grantable nor revocable. | Bite creator |

How they compose: **Bite Creator is the base every account holds**, because the consumer
app has no role gate - only `authGuard`. Roles are additive rather than exclusive (one
account may hold `admin` and `business` at once), but holding one role does **not** imply
holding another - see `L-2`.

*Operator* is the accepted short form in prose, matching
[[UC - Operate BiteTribe In The Admin App]]; the other two are used in full.

Ownership itself is **modelled, not implemented**: `Restaurant.ownerUserId` and
`claimStatus` have no writer, so every Restaurant is `unclaimed`. See
[[UC - Own And Claim Restaurants]].

## What each role may do

Granted today: yes. Target state, not implemented: **target**. Not granted: no.

| Capability | Operator | Restaurant Owner | Bite Creator |
|---|---|---|---|
| Consumer app: create and edit own Bites, browse, search, bucket lists, follow, like, review | yes | yes | yes |
| Sign into the Admin App | yes | no | no |
| Sign into the Business App | no `L-2` | yes | no |
| Verify a RestaurantCandidate | yes | no | no |
| Grant and revoke roles | yes | no | no |
| Run the operational migrations | yes | no | no |
| Cluster a Bite into a Candidate on demand | yes | no | no |
| Maintain a Restaurant's menu, hours, address, links | no `L-2` | yes, own only ¹ | no |
| **Create and publish a BiteTrail** | no | yes, today `L-1` | **target** `L-1` |
| Acquire a BiteTrail as a Bucketlist | yes | yes | yes |
| Write `bite.restaurantId` | yes, via verification | no | yes, via the Bite form ² |
| Report content, block a user, moderate | no `L-3` | no `L-3` | no `L-3` |

¹ The intent, not an enforced boundary, because ownership has no writer.

² Set when the creator picks a verified nearby Restaurant, on create **and** on edit.
This makes the Bite Creator one of three writers of that field; see
[[UC - Verify Restaurant Candidate]], rule `R-8`.

## Not roles

| Concept | What it actually is |
|---|---|
| Food lover | A subset of Bite Creator's permissions. There is no read-only role - any authenticated account may create |
| Traveler | A subset of Food lover |
| New user | A lifecycle state (`onboardingCompletedAt`, `onboardingVersion`), not a permission |
| Privacy-conscious participant | A settings choice (`PublicUser.public`), not a permission |
| **Public / Private Profile** | The same visibility choice, not a capability |
| **BiteTribe Pro** | An entitlement on `PublicUser.subscriptionTier`: `0` = Free, `>= 1` = Pro. Orthogonal to every role. No purchase path exists. See [[Subscription]] |
| **BiteTrail Creator** | An activity of the *Food curator or vlogger* persona, not a permission. Publishing a BiteTrail becomes a Bite Creator capability under `L-1`; the proposed `curator` claim is retired by `RD-6` |
| **Moderator** | Does not exist. Named in [[Glossary]] only to state its absence |
| **Unauthenticated visitor** | Reaches only `start` and the auth routes |
| **The backend itself** | Cloud Functions act with admin credentials and no role. It is the actual writer in most flows, which is why the open Firestore rules matter - see `L-4` |

The first four are personas: audiences, not authorization concepts, and they must not
become roles. BiteTrail Creator was a role for one day - see `RD-4` and `RD-6`.

## Current Limitations

Two of these are this page's own. Two are owned elsewhere and are pointers rather than
restatements, so that a fact has one home.

**`L-1` BiteTrail creation requires the wrong role. `[Secondary]`, decided.** Both
`create-bite-trail` and the BiteTrail dashboard routes sit behind the `business` guard,
and the consumer app has no route that creates a BiteTrail - only viewing one, acquiring
it as a Bucketlist, and the Marketplace listing. So a food curator can publish only by
being registered as a restaurant, contradicting the purpose of the Business App gate.

**Resolved by `RD-6` in two parts, without a new claim.**

**Part 1 - curator onboarding for launch. `RD-7`: nothing to build.** An Operator grants
`business` to a BiteTribe-held account, and that account curates the launch BiteTrails.
No code, no surface, no issue. Acceptable only for accounts BiteTribe controls, because
the Business App also hands them every Restaurant-maintenance surface, so it is not
offered to external curators.

**Part 2 - move creation into the consumer app, ungated.** The Business App create and
BiteTrail dashboard routes are retired and publishing becomes a Bite Creator capability,
like creating a Bite. The UI has to leave `libs/bite-tribe-business/*` for a library both
apps may import, because of the Nx scope tags. Sequenced behind `L-3`: an ungated publish
path into the Marketplace is only safe once reporting exists. **Owning issue: not yet
filed.**

`[Secondary]` for the initial release: BiteTrails are not sold, part 1 covers launch
content, and the business app is out of release-candidate scope with a soft launch of its
own ([[Current State - Release State]]).

**What this requires of the monetization epic.** Epic \#1125 places the creator flow in
the Business App - \#1154 is *creator pricing and publish flow in the business app* and
\#1157 the earnings dashboard there. Both contradict step 2 and have to be corrected.
When paid BiteTrails arrive the gate is the epic's own rule - *no publishing a paid
BiteTrail before payout onboarding is complete* - which is a Stripe Connect entitlement,
not a role. That is why no claim is needed here.

**`L-2` The `admin` / `business` hierarchy is undecided, and the current answer strands
data. `[Secondary]`** `admin` and `business` are deliberately not a hierarchy in the
code, so an Operator verifies a RestaurantCandidate and then cannot maintain the
resulting Restaurant - no edit-restaurant surface in the Admin App, the Business App
requires `business`, and the Restaurant has no owner either. Owned by
[[UC - Verify Restaurant Candidate]] `S-10` and issue \#1164, with owner assignment
itself in issue \#1069. Not restated here.

**`L-3` There is no way to report content, block a user, or moderate anything. `[MVP]`**
No report action, no block list, no moderation surface, no moderator role, no content
filtering, and no Operator capability to suspend an account's ability to create Bites -
the last of which follows from Bite Creator carrying no claim: there is no grant to
revoke.

`[MVP]` because it is a store requirement rather than product polish. BiteTribe is a
user-generated-content app by any reading - photos, free-text reviews, review threads,
display names, public profiles, a follower graph, a discovery feed - and
[[Implementation - Store Declarations]] declares the **Social Media** data-use category
at a **13+** age rating. Apple requires such an app to offer content filtering, a
reporting mechanism with a timely response, blocking of abusive users and published
contact details; Google Play has an equivalent policy.

| Half of the capability | State |
|---|---|
| Operator actions | Planned. Blocking an account is issue \#1474, deleting an improper Bite is \#1475, both children of epic \#1471 |
| The report queue | Planned. Epic \#1284, which predates the `admin` role and is to be re-read rather than followed as written |
| Report action, block list, content filtering | **No owning issue** |
| Published contact details | `support@bitetribe.app` does not exist yet - issue \#1429 |
| A written response-time expectation | Missing. The guideline asks for *timely* action, not merely a button |

**The store position has to be established before any of it is built.** Both stores
entered review on 31 August 2026 for the soft launch and
[[Current State - Release State]] does not record the outcome, so whether Apple has
already passed the app on this point is unknown. Record the finding either way.

**`L-4` Roles are not enforced at the data layer. `[Secondary]`, by decision.**
`firestore.rules` grants read and write on every document to every authenticated user,
so a role gate stops an account reaching a page rather than stopping a determined caller
writing a document. Accepted as a documented launch risk on 19 August 2026 under issue
\#1177 and owned by [[Current State - Known Issues]] - issue \#1078 for Firestore,
\#1350 for Storage, which is the more exploitable of the two. Not restated here.

## Recorded Decisions

Taken 7 September 2026.

| # | Decision |
|---|---|
| `RD-1` | ~~The authorization vocabulary is four roles~~ - **superseded by `RD-6`**. Three roles: **BiteTribe Operator**, **Restaurant Owner**, **Bite Creator** |
| `RD-2` | Roles and personas stay separate vocabularies, cross-referenced. Roles live here; personas stay in [[Personas]] |
| `RD-3` | "Business User" is retired. Every occurrence resolves to Operator or Restaurant Owner |
| `RD-4` | ~~**BiteTrail Creator becomes a fourth role.**~~ - **superseded by `RD-6`**, same day. The id is retired, not reused |
| `RD-5` | The Operator role name aligns with the existing "BiteTribe operator" wording rather than introducing "Admin" as a domain term |
| `RD-6` | **The BiteTrail Creator role is retired and the `curator` claim is not introduced.** Publishing a BiteTrail becomes a Bite Creator capability in the consumer app; launch content is seeded by granting `business` to BiteTribe-held accounts, and the eventual paid gate is payout onboarding rather than a claim. See `L-1` |
| `RD-7` | **Curator onboarding for the initial release needs no implementation.** An Operator grants `business` to a BiteTribe-held account, which curates the launch BiteTrails. Part 1 of `L-1`, closed by decision rather than by work |

`RD-4` was recorded and reversed on the same day, 7 September 2026. It was taken before
the surface question was answered, and answering it removed the need for the role rather
than placing it. Both entries stay so the reversal is visible.

`RD-3` in context: "Business User" named *both* the Operator and the Restaurant Owner
depending on which page you read, which is the ambiguity that made restaurant-candidate
verification look like a restaurant's job when it has been BiteTribe-internal since
issue \#1473.

`RD` ids are project-wide and not contiguous within any single page; the numbers absent
here belong to other pages.

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
- [[Current State - Release State]]
