# UC - Verify Restaurant Candidate

## Status

Implemented and in use. The backend callable `verifyRestaurantCandidate` is
`admin`-gated since issue \#1472, and the Operator surface moved into
`bite-tribe-admin` with issue \#1473.

Four candidate statuses are declared; two have writers. `dismissed` and `merged` are
read but never written — `merged` is removed by decision `RD-7`, and dismissal is
specified but not built. Work in flight: epic \#1495.

**Verified against the code on 7 September 2026**, branch `develop` at `d015d6fa`,
read-only.

| Aspect | State |
|---|---|
| Backend callable `verifyRestaurantCandidate` | Implemented, `admin`-gated |
| Operator surface (candidate list, new-restaurant form) | Implemented in `bite-tribe-admin` |
| `UC-GIM` — Initial Menu | Implemented, but reachable only inside verification |
| `UC-ARB` — assign Bites | Reachable only inside verification; no standalone writer |
| `UC-DIS` — dismiss | Not implemented: no writer, no surface |
| `UC-MRC` — resolve a duplicate | Not implemented. Specified by `RD-7`: a Candidate is resolved against an already verified Restaurant, and `merged` is deleted |
| `UC-ARO` — assign owner | Not implemented: model only, no writer |
| Authorization at the data layer | Open. `firestore.rules` grants every authenticated user every write. Owned by \#1078 |

## Goal

Repeated Bites at one place become a real, discoverable Restaurant through a single
deliberate human decision, made by a BiteTribe Operator, in one transaction that either
completes or changes nothing.

Everything the flow touches but does not own — detection, Bite assignment, Menu
generation, dismissal, duplicate resolution, ownership — is a referenced Use Case. This
page states *where* each reference sits and *what it must guarantee*, never how it
works, so that a defect is locatable in exactly one document.

## Actors

The authorization vocabulary is four roles, defined in [[User Roles]]. Only one of them
acts here.

- **BiteTribe Operator** (short: *Operator*), holding the `admin` claim. The only
  actor, lane `OP`.
- **Restaurant Owner** — downstream only, and optionally assigned at `V10`.
- **Bite Creator** — not an actor here: not notified, and holding no rights. It is,
  however, a writer of `bite.restaurantId`; see `R-8`.
- **BiteTrail Creator** — no part in this Use Case.

**The role hierarchy is not implemented.** The role model places Operator above
Restaurant Owner. The code states that `admin` and `business` are deliberately *not* a
hierarchy, so an Operator holds no Restaurant Owner rights and cannot maintain the
Restaurant it just verified — which, by `G7`, also has no owner.

### Non-actor lanes

`UI` Admin App (Angular) · `SYS` Cloud Function `verifyRestaurantCandidate` ·
`DB` Firestore · `EXT` Google Places API

## Notation

The flow below is a text actogram. One step per block; `StepId` is stable and is never
renumbered.

```
<StepId>  <LANE>  <action, present tense>
          └─→ <LANE>  <effect on that lane>
          ├─ <condition> → <StepId | END-x>     branches are exhaustive
          REF:<UC-ID>  <what the referenced Use Case must guarantee here>
          INV:<Rule-ID>                          an invariant that holds at this step
          [optional]                             skippable; the flow is valid without it
```

## Scope

In scope: one Operator, one `pending` Candidate, one decision — verify. Correcting the
proposed Restaurant data, and the transactional creation of the Restaurant.

Out of scope. Each of these is its own Use Case, referenced from the step it belongs to:

| UC-ID | Use Case | Referenced at | Direction |
|---|---|---|---|
| `UC-DRC` | Detect Restaurant Candidate | Precondition | Upstream, and the sole owner of every way a Candidate comes into existence — the automatic trigger *and* the Operator's on-demand clustering callable |
| `UC-DIS` | Dismiss Restaurant Candidate | `V4` | Alternative outcome |
| `UC-MRC` | Resolve Candidate Against An Existing Restaurant | `V4`, `V17` | Alternative outcome |
| `UC-ARO` | [[UC - Own And Claim Restaurants]] | `V10` | Optional step inside this Use Case |
| `UC-GIM` | Generate Initial Menu From Bite Evidence | `V19` | Invoked step |
| `UC-ARB` | Assign Bites To Restaurant | `V23` | Invoked step |
| `UC-MRB` | [[UC - Maintain Restaurants In The Business App]] | After `END-V4` | Downstream |
| `UC-OPS` | [[UC - Operate BiteTribe In The Admin App]] | `V1` | Enclosing: sign-in and the role gate |

Of the referenced Use Cases, **`UC-DRC`, `UC-DIS`, `UC-MRC`, `UC-GIM` and `UC-ARB` do not yet exist as pages.** They are named here so that each rule this flow depends on has an owner, and so that writing them is a visible gap rather than an omission.

## Preconditions

| # | Precondition | Owner |
|---|---|---|
| P1 | `/restaurantCandidates/{candidateId}` exists with `status == 'pending'` | `UC-DRC` |
| P2 | It carries `name`, `position`, `geohash`, `biteIds`, `evidence` | `UC-DRC` |
| P3 | The acting account holds the `admin` claim and is signed into the Admin App | [[UC - Operate BiteTribe In The Admin App]] |
| P4 | The client holds a valid App Check token | Platform |

**Not a precondition:** that the evidence Bites still exist — see `V18` — and **not**
that the Candidate is backed by at least five Bites. `UC-DRC` has two producers: the
automatic trigger, which requires five matching nearby Bites, and the Operator's
on-demand clustering callable, which applies no threshold at all. A Candidate can
therefore reach `V3` backed by a single Bite.

## Trigger

An Operator decides to verify a listed Candidate. There is no automatic, scheduled or
event-driven trigger — **verification is always a human decision.**

## Guarantees

On the successful path, `END-V4`:

| # | Guarantee |
|---|---|
| G1 | Exactly one `/restaurants/{restaurantId}` exists for this Candidate |
| G2 | Exactly one `/menus/{menuId}` exists and is referenced by `restaurant.menuId` |
| G3 | Every evidence Bite that still exists carries `bite.restaurantId == restaurantId` |
| G4 | The Candidate carries `status == 'verified'`, `verifiedRestaurantId`, `verifiedAt`, `verifiedAtTimestamp`, `verifiedByUserId` |
| G5 | G1 to G4 are atomic. No intermediate state is observable |
| G6 | The decision is attributable to one Operator account |
| G7 | The Restaurant is `unclaimed` unless `V10` was performed |

---

## Actogram

### Phase 1 - Selection

```
V1   OP   signs into the Admin App
          REF:UC-OPS   the `admin` claim is verified before a session exists;
                       an account without it receives the generic login failure
          → V2

V2   OP   opens the Restaurant Candidates surface
          └─→ UI   reads DB  /restaurantCandidates  where status == 'pending'
                             limit 5
          └─→ UI   resolves each Candidate's biteIds into Bite evidence,
                   one document read per Bite
          INV:R-1
          → V3

V3   UI   renders per Candidate: name, evidence count, up to 3 dish or place
          names from the evidence Bites, position as "latitude, longitude"
          → V4

V4   OP   decides on one Candidate
          ├─ is not a real restaurant       → REF:UC-DIS  → END-V1
          ├─ is a place that already has a verified Restaurant
          │                                 → REF:UC-MRC  → END-V2
          ├─ cannot decide yet              → END-V3
          └─ is a real restaurant           → V5
          NOTE: UC-DIS and UC-MRC have no implementation, so those two branches
                are decisions the Operator can reach but not execute.
```

### Phase 2 - Review and completion

```
V5   OP   selects the Candidate
          └─→ UI   seeds a Restaurant draft from it: name, position,
                   restaurantCandidateId, biteIds, bites; opens the form
          INV:R-2
          → V6

V6   OP   reviews the Bite evidence rendered in the form
          ├─ evidence contradicts the proposal  → V4  (re-decide)
          └─ evidence supports the proposal     → V7

V7   OP   requests a Google Places prefill                          [optional]
          └─→ SYS  text search for the draft name, biased by the Candidate
                   position → EXT Google Places
          └─→ OP   picks one place
          └─→ UI   overwrites name, description, street, postcode, city, country
          INV:R-3
          ├─ prefill fails   → V8  (form unchanged, error toast)
          └─ prefill applied → V8

V8   OP   completes the mandatory data: image, name, position
          INV:R-4
          → V9

V9   OP   completes the optional data                               [optional]
          description, address, opening hours, social media links
          → V10

V10  OP   assigns a Restaurant Owner                                [optional]
          REF:UC-ARO   must set restaurant.ownerUserId and claimStatus, and grant
                       the owner account the `business` role, as one action with
                       the same atomicity as Phase 3
          ├─ skipped  → V11   (Restaurant stays unclaimed, G7)
          └─ assigned → V11
          NOTE: no writer exists, so this step cannot be performed today and
                every Restaurant leaves this flow unclaimed.

V11  OP   decides
          ├─ abandons the review  → END-V3   (Candidate stays `pending`)
          └─ submits              → V12

V12  UI   removes the draft-only fields (id, unsaved, restaurantCandidateId,
          biteIds, bites)
          └─→ SYS  calls verifyRestaurantCandidate { candidateId, restaurant }
          INV:R-5
          → V13
```

### Phase 3 - Verification, one backend transaction

```
V13  SYS  enforces the caller's identity
          ├─ no App Check token      → END-E1
          ├─ not authenticated       → END-E2  `unauthenticated`
          ├─ authenticated, no admin → END-E3  `permission-denied`
          └─ admin                   → V14
          INV:R-6

V14  SYS  validates the request
          ├─ candidateId is not a non-empty string → END-E4  `invalid-argument`
          └─ valid                                 → V15

V15  SYS  reads the Candidate INSIDE the transaction
          ├─ does not exist → END-E5  `not-found`
          └─ exists         → V16

V16  SYS  checks the Candidate status
          ├─ != 'pending' → V17
          └─ == 'pending' → V18

V17  SYS  resolves the already-decided Candidate (idempotency)
          ├─ carries verifiedRestaurantId  → returns it → END-V5
          │  set either by V24, or by UC-MRC pointing at another Restaurant
          └─ otherwise (e.g. `dismissed`)  → END-E6  `failed-precondition`
          INV:R-7
          NOTE: the code additionally follows a mergedIntoCandidateId here.
                That branch is deleted by decision RD-7.

V18  SYS  reads the evidence Bites INSIDE the transaction, before any write
          └─ a Bite deleted after detection is skipped rather than failing the
             transaction and stranding the Candidate in `pending`
          → V19

V19  SYS  derives the Initial Menu from the surviving evidence Bites
          REF:UC-GIM   must return menu categories for a set of Bites, and an
                       empty category list when no Bite has a usable dish name
          → V20

V20  SYS  builds the Restaurant document from the submitted data
          ├─ name empty, or position not two finite numbers
          │                → END-E7  `invalid-argument`
          └─ valid         → V21
          └─→ SYS  derives geohash from the position and links menuId

V21  SYS  creates the Restaurant   └─→ DB  /restaurants/{restaurantId}   → V22

V22  SYS  creates the Menu         └─→ DB  /menus/{menuId}, categories from V19
                                                                        → V23

V23  SYS  links the evidence Bites to the Restaurant
          REF:UC-ARB   must set bite.restaurantId, and must define the behaviour
                       when the Bite already carries a different restaurantId
          └─→ DB   bite.restaurantId = restaurantId, for every surviving Bite
          INV:R-8
          NOTE: today this step is inlined rather than delegated, and it writes
                unconditionally.
          → V24

V24  SYS  marks the Candidate as verified
          └─→ DB   status = 'verified', verifiedRestaurantId, verifiedAt,
                   verifiedAtTimestamp, verifiedByUserId, updatedAt
          → V25

V25  SYS  returns { restaurantId, menuId, menuItemCount, candidateId,
                    status: 'created' }
          INV:R-9
          → V26
```

### Phase 4 - Completion and hand-over

```
V26  UI   uploads the Restaurant image                    [only if base64]
          └─→ SYS  saveRestaurantImage(restaurantId, image)
          ├─ fails → END-E8  (Candidate verified, Restaurant without image)
          └─ ok    → V27
          INV:R-10 is VIOLATED here: this write is outside the Phase 3
               transaction, and it is a direct client write to /restaurants.

V27  UI   reloads the Candidate list, navigates back to the dashboard   → V28

V28  DB   end state
          ├─ candidate  = 'verified'
          ├─ restaurant = created, claimStatus absent → counts as `unclaimed`
          ├─ menu       = created (possibly with no categories)
          └─ bites      = restaurantId set
          → END-V4
```

### Terminal states

| End | Kind | Candidate | Meaning |
|---|---|---|---|
| `END-V1` | Hand-over | `dismissed`, intended | Left to `UC-DIS` |
| `END-V2` | Hand-over | `verified`, pointing at the existing Restaurant | Left to `UC-MRC` |
| `END-V3` | Abort | `pending` | Deferred or abandoned. No side effect |
| `END-V4` | **Success** | `verified` | G1 to G7 hold |
| `END-V5` | Success, idempotent | unchanged | Existing Restaurant returned, nothing created |
| `END-E1` | Rejection | `pending` | App Check |
| `END-E2` | Rejection | `pending` | `unauthenticated` |
| `END-E3` | Rejection | `pending` | `permission-denied`, not an Operator |
| `END-E4` | Rejection | `pending` | `invalid-argument`, candidateId |
| `END-E5` | Rejection | — | `not-found`, Candidate gone |
| `END-E6` | Rejection | unchanged | `failed-precondition`, decided but no Restaurant |
| `END-E7` | Rejection | `pending` | `invalid-argument`, name or position |
| `END-E8` | **Partial success** | `verified` | Restaurant exists without its required image |

---

## Rules And Invariants

| ID | Normative statement | Code anchor |
|---|---|---|
| **R-1** | The list shows only `status == 'pending'`. A Candidate that has left `pending` is out of this Use Case's reach by any path other than `V17`. | `restaurants-data-access.service.ts` |
| **R-2** | The Candidate is ground truth for the initial `position`. Nothing may replace it with a derived or seeded value. | `restaurants.service.ts` |
| **R-3** | The Google Places prefill never touches `position`. It overwrites exactly `name`, `description`, `street`, `postcode`, `city`, `country`. | `new-restaurant-page.component.ts`, `PREFILLABLE_CONTROLS` |
| **R-4** | `name` and `position` are validated twice, in the form and again at `V20`. The backend never trusts the client's validation. | `verify-restaurant-candidate.ts`, `toRestaurantDocument` |
| **R-5** | The Candidate-based save path is **not** the ordinary create-restaurant path. A client saving through the ordinary store path bypasses all of Phase 3. | `new-restaurant.service.ts` |
| **R-6** | Authorization is enforced in the backend on the verified ID token. The route guard is a convenience, not the gate. | `shared/roles.ts`, `requireAdmin` |
| **R-7** | Verification is idempotent. A second call for the same Candidate returns the existing Restaurant and creates nothing. | `verify-restaurant-candidate.ts` |
| **R-8** | `bite.restaurantId` has **four** writers. `V23` is the only transactional one, and the only one inside this Use Case. Two more sit in the Bite form, which carries a `restaurantId` control set when a Bite Creator picks a verified nearby Restaurant: the whole form value is persisted on create **and on edit**. The fourth is the Admin App's Candidate-free save path, which links every listed Bite in a client-side write outside any transaction; it is unreachable today only because the Bite-places surface passes no `biteIds`. Detection is deliberately **not** a writer — see `RD-9` and `UC-DRC` `R-6`. | `verify-restaurant-candidate.ts`; `bite.page.ts`, `onRestaurantSelected`; `restaurant-api.service.ts`, `saveNewRestaurant` |
| **R-9** | `V21` to `V24` are one transaction. No observable state has a Restaurant without its Menu, or Bites pointing at a Restaurant whose Candidate is still `pending`. | `verify-restaurant-candidate.ts` |
| **R-10** | *Intended, not met.* Everything the Restaurant needs in order to be valid is written inside `R-9`'s transaction. `V26` breaks this. | `restaurants-data-access.service.ts` |
| **R-11** | The Initial Menu is a **draft derived from evidence**, not a statement about the real menu. Its prices are averages of what Bite Creators reported. | `shared/utils/initial-menu.ts` |
| **R-12** | A Bite Creator is never notified and sees no state change from this Use Case, other than their Bite now appearing under a Restaurant. | — |

## Exceptions And Failure Modes

| # | Situation | Behaviour | Assessment |
|---|---|---|---|
| E1 | An evidence Bite was deleted after detection | Skipped at `V18`; the transaction completes | Correct |
| E2 | No evidence Bite has a usable dish name | Empty Menu, no error | Correct |
| E3 | The same Candidate is verified twice | `END-V5`; the existing Restaurant is returned | Correct |
| E4 | The Candidate is `dismissed` | `END-E6`; nothing is created | Correct |
| E5 | The Candidate is `merged` | `V17` resolves via `mergedIntoCandidateId` | To be deleted: nothing writes the status, and it is dropped by `RD-7` |
| E6 | The image upload at `V26` fails | Candidate verified, Restaurant without image, unhandled rejection | Defect |
| E7 | An evidence Bite already belongs to another Restaurant | Silently overwritten at `V23` | Defect, reachable today by a Bite Creator editing their own Bite |
| E8 | More than five Candidates are `pending` | Only five are reachable, and always the same alphabetically-first five | Defect |
| E9 | The Operator renames or relocates the Restaurant at `V8` | The verified Candidate can later be reset to `pending` and verified a second time, producing a duplicate Restaurant | Defect |

## Authorization

**Enforced.** The callable requires the `admin` claim on the verified ID token at
`V13`. A `business` account and a plain Bite Creator both receive `permission-denied`;
an unauthenticated caller receives `unauthenticated`. The two are deliberately
distinct: "sign in" versus "signing in will not help". App Check is enforced outside
the emulator. The Admin App refuses sign-in without the role, and `roleGuard('admin')`
backs that up per route for a restored session or a revoked role. The acting Operator
is recorded as `verifiedByUserId`, satisfying `G6`.

**Not enforced.** `firestore.rules` grants read and write on every document to every
authenticated user. `V2` is a direct client read of `/restaurantCandidates`, and the
same openness lets any signed-in Bite Creator write a `/restaurants` document, or set a
Candidate to `verified`, without ever calling the callable. `V26` depends on that
openness today. The guard protects the *flow*, not the *data*. Owned by \#1078.

## App Store Review Area

**Direct relevance: none.** There is no consumer surface. The Admin App is a web app,
is `noindex, nofollow`, and does not go through Apple or Google review. No native
capability is used, so no Capacitor permission and no Privacy Nutrition Label entry
changes.

**Indirect relevance.** Two content questions this Use Case creates for the consumer
app, which *is* reviewed:

1. **The Initial Menu is published as a Restaurant's menu.** Its items and prices are
   derived from Bite reports, per `R-11`, not from the business, and nothing marks it
   as such. A reviewer comparing a listed price to the real one sees an inaccuracy
   attributed to a named business.
2. **The Restaurant is created unclaimed,** per `G7`. `V21` publishes a page about a
   real, named business that has not been involved. That is a data-protection and
   business-representation question rather than a store-review one; it belongs to
   `UC-ARO`, and is noted here only because `V21` is where the page starts existing.

Neither blocks the current release candidate. Both are recorded here so they are not
discovered in review.

---

## Recorded Decisions

Taken on 7 September 2026.

| # | Decision |
|---|---|
| `RD-6` | **Scope.** `V19` and `V23` stay inside the verification transaction but are *referenced* steps, owned by `UC-GIM` and `UC-ARB`. This Use Case covers verification only; dismissal and duplicate resolution are referenced Use Cases with their own terminal states. Owner assignment is an optional step at `V10`, referencing `UC-ARO` |
| `RD-7` | **`merged` is removed.** `merged` and `mergedIntoCandidateId` go from both model copies, and `V17`'s merge branch with them. A duplicate Candidate is resolved against an **already verified Restaurant**, which needs no status of its own. Real merging already happens by document-id convergence, which unions `biteIds` without any status, event or audit trail |
| `RD-8` | **`UC-DRC` owns every producer.** Both the automatic trigger and the Operator's on-demand clustering callable belong to detection, so the threshold divergence is stated once, next to the threshold |
| `RD-9` | **Refused evidence is not rerouted.** When a write onto a non-`pending` Candidate is refused, the refusal is logged and no Bite is written. Those Bites carry no `restaurantId` and therefore stay visible on the Admin App's Bite-places surface. Detection does not become a writer of `bite.restaurantId` |
| `RD-10` | **The on-demand producer keeps no evidence threshold.** A deliberate Operator action is the safeguard. The collection's invariant is restated instead: every Candidate is either backed by at least five matching Bites within 200 m, **or** marked as Operator-created |
| `RD-11` | **The derived-menu marker never clears automatically.** Retraction is an explicit confirmation by the Restaurant Owner. Because `ownerUserId` has no writer, that action is sequenced behind owner assignment (`UC-ARO`, \#1069) rather than shipped alongside the marker — so the marker is never a declared state without a writer, which is the mistake `RD-7` removes |
| `RD-16` | **The Candidate list has one server-side order and no selectable ordering:** `evidence.biteCount` descending, then `createdAtTimestamp` descending. The consumer app's client-side sort criterion reorders an already-fetched array, which cannot affect *which* Candidates a limited query returns — and that is this list's actual defect. A work queue for two Operators also has one defensible default, unlike a discovery feed where preference genuinely varies. Recorded so the divergence from the consumer convention reads as deliberate |

`RD` ids are project-wide and not contiguous within any single page; the numbers absent
here belong to other pages.

## Related Domains

- [[Restaurant]]
- [[Bite]]
- [[User]]

## Related Pages

- [[UC - Operate BiteTribe In The Admin App]]
- [[UC - Own And Claim Restaurants]]
- [[UC - Maintain Restaurants In The Business App]]
- [[Implementation - Firebase Functions]]
- [[Restaurant]]
