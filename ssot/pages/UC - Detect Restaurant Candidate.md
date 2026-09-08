# UC - Detect Restaurant Candidate

## Status

Implemented and in use, with **two producers**: an automatic Firestore trigger on Bite
creation, and an Operator-initiated callable `clusterRestaurantCandidateForBite`, which
is `admin`-gated since issue \#1472 and surfaced in `bite-tribe-admin` since issue
\#1473. Both converge on one shared clustering kernel; per `RD-VRC-8` this Use Case owns
both, and per `RD-DRC-18` they are two entries into one page rather than two pages.

The kernel is complete and the collection's invariants are not. Nothing records which
producer created a Candidate, nothing guards a write onto a Candidate that has already
been decided, and nothing re-evaluates a cluster after the Bites underneath it change.
Work in flight: epic \#1495.

**Verified against the code on 7 September 2026**, branch
`1513-use-case-create-ssot-use-case-for-restaurant-verification` at `d015d6fa`,
read-only.

| Aspect | State |
|---|---|
| Entry A — automatic trigger `createRestaurantCandidateOnBiteCreate` | Implemented |
| Entry B — callable `clusterRestaurantCandidateForBite` | Implemented, `admin`-gated |
| Shared clustering kernel `K1`–`K10` | Implemented, except `K9` |
| `K9` — guard against writing onto a non-`pending` Candidate | Not implemented. `R-8` |
| Producer marker on the Candidate | Not implemented: no field exists in either model copy, so `G7` cannot be checked |
| Re-evaluation after a Bite is edited, deleted or detached | Not implemented, and not designed. `R-11` |
| `merged` status | Still declared in both model copies; removed by `RD-VRC-7` |
| Entry B's eligible-Bite list | Implemented in the client, over the whole `/bites` collection. `R-13` |
| Authorization at the data layer | Open. `firestore.rules` grants every authenticated user every write, so the collection's invariants are not enforced where the data lives. Owned by \#1078 |

**One question is deliberately left open and is not recorded as a decision.** The Admin
App's Bite-places creation path (see *Out of scope*) creates a Restaurant with no
Candidate at all. Whether it is retired has not been decided, and the decision depends
on this Use Case first covering the case that path is the only route for: a place that
never reaches the evidence threshold.

## Goal

Repeated Bites at one place become **one** `pending` RestaurantCandidate — a claim, not
a fact, and the only input `UC - Verify Restaurant Candidate` accepts.

Detection decides nothing. It writes a single document and stops; every consequence of
that document — a Restaurant, a Menu, a Bite gaining a `restaurantId` — belongs to
`UC-VRC`. This page states the whole of *how a Candidate comes into existence*, so that
the two producers' one real difference is visible in one place instead of being
duplicated across two documents.

## Actors

The authorization vocabulary is four roles, defined in [[User Roles]].

- **BiteTribe Operator** (short: *Operator*), holding the `admin` claim. The only actor,
  lane `OP`, and only in Entry B.
- **Bite Creator** — **not an actor.** Creating a Bite is the *cause* of Entry A, not a
  participation in it: the Bite Creator makes no decision here, is never notified, sees
  no state change, and cannot observe the Candidate their Bite became evidence for.
- **Restaurant Owner**, **BiteTrail Creator** — no part in this Use Case.

**Entry A has no actor at all.** It runs in the Functions runtime with administrative
credentials, is not callable from any client, and no human is in the loop. This is the
argument that made `RD-DRC-18` a real decision rather than a formality.

### Non-actor lanes

`UI` Admin App (Angular) · `SYS` Cloud Functions (`createRestaurantCandidateOnBiteCreate`,
`clusterRestaurantCandidateForBite`) · `DB` Firestore

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

Two entries lead into one kernel. `A*` is the automatic producer, `B*` the on-demand
producer, `K*` the shared clustering code both of them execute. A step written `K5`
belongs to both entries and behaves differently depending on which one reached it; that
difference is stated at the step.

## Scope

In scope: everything that results in a document under `/restaurantCandidates`. Both
producers, the shared clustering kernel, the constants that govern it, the document
identity, and the merge semantics of a repeated detection.

Out of scope. Each of these is its own Use Case, referenced from the step it belongs to:

| UC-ID | Use Case | Referenced at | Direction |
|---|---|---|---|
| `UC-VRC` | [[UC - Verify Restaurant Candidate]] | `END-K4` | Downstream, and the sole consumer of what this Use Case produces |
| `UC-CMB` | [[UC - Create And Maintain Personal Bites]] | `A1` | Upstream cause of Entry A |
| `UC-OPS` | [[UC - Operate BiteTribe In The Admin App]] | `B1` | Enclosing: sign-in and the role gate |
| `UC-ROM` | [[UC - Run Operational Migrations]] | `B2` | Enclosing: the surface Entry B is offered on |
| `UC-DIS` | Dismiss Restaurant Candidate | — | Alternative downstream outcome. **Not a detection input:** see `E8` |

**Also out of scope, and not a Use Case: the Bite-places creation path.** The Admin App
offers a list of distinct `place` strings taken from all Bites; picking one opens the
same new-restaurant form used by verification, seeded with `position: {latitude: 0,
longitude: 0}` and **no** `restaurantCandidateId`. Submitting without a
`restaurantCandidateId` bypasses the verification callable entirely and creates a
Restaurant through five separate client-side writes with no transaction and no backend
validation. It is therefore a second, Candidate-free route to a Restaurant. It is not
detection, it produces no Candidate, and this Use Case states no rule about it.

Its status is unresolved rather than settled: retiring it would remove the only way to
create a Restaurant for a place that never reaches the `R-2` threshold, so Entry B has
to cover that case before the path can go.

## Preconditions

| # | Precondition | Owner |
|---|---|---|
| P1 | At least one `/bites/{biteId}` exists carrying a non-empty `place` and a `position` with two finite coordinates | `UC-CMB` |
| P2 | Bite documents carry a `geohash`, or the bounds query that finds them returns nothing. `R-14` | `UC-CMB` |
| P3 | *Entry B only.* The acting account holds the `admin` claim and is signed into the Admin App | [[UC - Operate BiteTribe In The Admin App]] |
| P4 | *Entry B only.* The client holds a valid App Check token | Platform |

**Not a precondition:** that no Candidate and no Restaurant exists for the place. Both
are checked inside the kernel, at `K3` and `K7`, and both checks are fuzzy — see `R-5`.

## Trigger

Entry A: the creation of a document under `bites/{biteId}`, by any writer. There is no
trigger on update and none on delete, which is `R-11`.

Entry B: an Operator deciding to cluster one specific Bite. There is no schedule and no
batch run.

## Guarantees

On the successful path, `END-K4`:

| # | Guarantee |
|---|---|
| G1 | Exactly one document under `/restaurantCandidates` is written, and it carries `status == 'pending'` |
| G2 | It carries `name`, `normalizedName`, `position`, `geohash`, `biteIds` and `evidence`, satisfying `UC-VRC` `P1` and `P2` |
| G3 | The document id is a pure function of the normalized name and the geohash bucket, so repeated detection of the same place converges on one document instead of accumulating duplicates |
| G4 | No Bite is written. Detection is never a writer of `bite.restaurantId` (`RD-VRC-9`) |
| G5 | No Restaurant and no Menu is created, and no existing Restaurant is modified |
| G6 | `biteIds` is a union with what the document already held, so it never shrinks |
| G7 | *Intended, not met.* Every Candidate is either backed by at least five matching Bites within 200 m, or marked as created by an Operator (`RD-VRC-10`). No field records the producer, so the second half of the invariant is unrepresentable |
| G8 | Atomicity is per document and nothing more. One merge write is the entire effect; there is no transaction, because there is nothing else to keep consistent with it |

---

## Actogram

### Entry A - automatic detection, no actor

```
A1   —    a Bite is created                                (cause, not an actor)
          REF:UC-CMB   the Bite carries `place` and `position` as the Bite
                       Creator entered or picked them; detection adds no
                       validation of its own
          → A2

A2   SYS  the trigger fires on bites/{biteId}
          └─→ SYS  reads the Bite from the event snapshot, not from DB
          ├─ no snapshot on the event  → END-A1   (logged, no-op)
          └─ snapshot present          → A3

A3   SYS  checks whether the Bite is eligible as a seed
          ├─ bite.restaurantId is set        → END-A1
          │  the Bite already belongs to a Restaurant; nothing to cluster
          ├─ place is empty or whitespace    → END-A1   (logged)
          ├─ position is absent, or either coordinate is not finite
          │                                  → END-A1   (logged)
          └─ eligible                        → K1
          INV:R-4
```

### Entry B - on-demand clustering, Operator

```
B1   OP   signs into the Admin App
          REF:UC-OPS   the `admin` claim is verified before a session exists
          → B2

B2   OP   opens the operational migrations surface
          REF:UC-ROM   the surface that offers restaurant clustering
          → B3

B3   UI   computes the eligible-Bite list, client-side
          └─→ UI   reads DB  /bites                        (whole collection)
          └─→ UI   reads DB  /restaurantCandidates  where status == 'pending'
          └─→ UI   keeps Bites with no restaurantId, not already in a pending
                   Candidate, with a non-empty place and a finite position,
                   then takes the first 50 in read order
          INV:R-13
          → B4

B4   OP   picks one Bite
          └─→ SYS  calls clusterRestaurantCandidateForBite { biteId }
          → B5

B5   SYS  enforces the caller's identity
          ├─ no App Check token      → END-B1
          ├─ not authenticated       → END-B2  `unauthenticated`
          ├─ authenticated, no admin → END-B3  `permission-denied`
          └─ admin                   → B6
          INV:R-12

B6   SYS  validates the request
          ├─ biteId is not a non-empty string → END-B4  `invalid-argument`
          └─ valid                            → B7

B7   SYS  reads the Bite
          └─→ DB   /bites/{biteId}
          ├─ does not exist → END-B5  `not-found`
          └─ exists         → B8

B8   SYS  checks whether the Bite is usable as a seed
          ├─ place is empty, or position is absent or not finite
          │                → END-B6  `failed-precondition`
          └─ usable        → K1
          NOTE: unlike A3, this step does NOT reject a Bite that already
                carries a restaurantId. The client filters those out of B3,
                but the callable accepts one. See E7.
```

### Kernel - shared clustering, both entries

```
K1   SYS  plans the geohash query bounds for a 200 m radius around the
          seed Bite's position
          INV:R-1
          → K2

K2   SYS  reads the neighbourhood, three queries in parallel
          └─→ DB   /restaurants           within the bounds
          └─→ DB   /bites                 within the bounds, with the seed
                                          Bite forced into the result
          └─→ DB   /restaurantCandidates  within the bounds, any status
          ├─ a bounds query fails → it is logged and yields no documents;
          │                         for /restaurants only, the whole
          │                         collection is read instead      → K3
          └─ ok                   → K3
          INV:R-14
          INV:R-2   the seed Bite counts as its own evidence

K3   SYS  looks for a Restaurant that is already this place
          matched within 200 m and a name score of at least 0.82
          ├─ match, Entry A   → END-K1   logged, no Candidate written
          ├─ match, Entry B   → END-K2   the Restaurant id is returned to
          │                              the Operator
          └─ no match         → K4
          INV:R-5

K4   SYS  matches the nearby Bites against the seed
          └─→ SYS  drops a Bite with no position, a Bite already carrying a
                   restaurantId, a Bite further than 200 m, and a Bite whose
                   place scores below 0.82
          └─→ SYS  Entry B counts each reason for dropping and returns the
                   counts; Entry A discards them
          INV:R-4
          INV:R-16
          → K5

K5   SYS  applies the evidence threshold      ← THE STEP THAT DIFFERS BY ENTRY
          ├─ Entry A, fewer than 5 matched Bites → END-K3   logged, no
          │                                                 Candidate written
          ├─ Entry A, 5 or more                  → K6
          └─ Entry B, any number including zero  → K6
             no threshold, by RD-VRC-10: the Operator's deliberate action is the
             safeguard, and the count is returned so it is visible
          INV:R-2

K6   SYS  aggregates the matched Bites into a draft
          └─→ SYS  name       = the most frequent raw place string among them,
                                falling back to the seed Bite's place
          └─→ SYS  position   = the mean of the matched Bites' positions,
                                falling back to the seed Bite's position
          └─→ SYS  geohash    = derived from that position
          └─→ SYS  biteIds    = the matched ids, de-duplicated
          └─→ SYS  evidence   = biteCount, the place-name histogram, the
                                average rating and the image paths
          INV:R-9
          INV:R-10
          → K7

K7   SYS  looks for a nearby pending Candidate for the same place
          only status == 'pending' qualifies; the best name score wins, then
          the shortest distance
          ├─ found     → K8  the write targets that document
          └─ not found → K8  the write targets a derived id
          → K8

K8   SYS  determines the target document id
          └─→ SYS  the found duplicate's id, or
                   `<normalizedName, non-alphanumerics to '-', capped at 80>`
                   + `-` + `<the first 7 geohash characters>`
          INV:R-7
          → K9

K9   SYS  guard: refuses a write onto a target that is not `pending`
          ├─ target exists and status != 'pending' → refuse, log, write
          │                                          nothing              → END-K5
          └─ target is absent or `pending`          → K10
          INV:R-8 is VIOLATED here: this step does not exist in the code.
               The write at K10 is unconditional, so a target that is
               `verified` or `dismissed` is reset to `pending`. See E1.
          NOTE: RD-VRC-9 fixes the behaviour of the refusal: nothing is
                rerouted, no Bite is written, and the refused evidence
                stays visible on the Admin App's Bite-places surface.

K10  SYS  merge-writes the Candidate
          └─→ DB   status = 'pending' (unconditionally),
                   biteIds = the union with what the document held,
                   evidence.biteCount = the size of that union,
                   evidence.placeNames / averageRating / imagePaths = this
                     run's matched Bites only,
                   name, normalizedName, position, geohash = kept if the
                     document already had them,
                   updatedAt, updatedAtTimestamp always,
                   createdAt, createdAtTimestamp only for a new document
          INV:R-6
          INV:R-9
          INV:R-10
          → END-K4
```

### Terminal states

| End | Kind | Entry | Result |
|---|---|---|---|
| `END-A1` | Abort | A | Silent no-op. The Bite is not an eligible seed. No Candidate, and no record that detection considered it beyond a log line |
| `END-B1` | Rejection | B | App Check |
| `END-B2` | Rejection | B | `unauthenticated` |
| `END-B3` | Rejection | B | `permission-denied`, not an Operator |
| `END-B4` | Rejection | B | `invalid-argument`, `biteId` |
| `END-B5` | Rejection | B | `not-found`, the Bite is gone |
| `END-B6` | Rejection | B | `failed-precondition`, the Bite has no place or no position |
| `END-K1` | Hand-over | A | A verified Restaurant is already this place. No Candidate. The Bite stays unlinked, so nothing connects it to that Restaurant |
| `END-K2` | Hand-over | B | The same match, reported: `verifiedRestaurantId` and `status: 'verified-restaurant-match'` are returned. Still no Candidate and still no link |
| `END-K3` | Abort | A | Below the evidence threshold. No Candidate. Nothing remembers the near-miss, so the next Bite recomputes it from scratch |
| `END-K4` | **Success** | A, B | A `pending` Candidate exists. `G1` to `G8` hold. Hands over to `UC-VRC` `P1` |
| `END-K5` | Refusal, intended | A, B | `R-8`'s guard refuses the write. Not implemented: today this path leads to `END-K4` on top of an already decided Candidate |

---

## Rules And Invariants

| ID | Normative statement | Code anchor |
|---|---|---|
| **R-1** | The clustering radius is **200 m** and the minimum place-name match score is **0.82**. Both bind both entries, and both are used for three different questions: matching a Bite, matching a verified Restaurant, and matching a pending Candidate. | `shared/utils/restaurant-candidates.ts`, `RESTAURANT_CANDIDATE_RADIUS_IN_M`, `DEFAULT_MATCH_SCORE` |
| **R-2** | The evidence threshold is **five matching Bites** and applies to **Entry A only** (`RD-VRC-10`). The seed Bite is forced into the neighbourhood result and matches itself, so five means the seed plus four others. | `create-restaurant-candidate-on-bite-create.ts`, `RESTAURANT_CANDIDATE_EVIDENCE_THRESHOLD`; `restaurant-candidate-store.ts`, `getNearbyBites` |
| **R-3** | *Intended, not met.* The threshold and the score are each declared once. `0.82` exists twice, as `DEFAULT_MATCH_SCORE` and as `MINIMUM_PLACE_NAME_MATCH_SCORE`, in two files, with nothing checking that they agree. | `restaurant-candidates.ts`; `restaurant-candidate-store.ts` |
| **R-4** | A Bite that already carries `restaurantId` is never evidence, in either entry. Entry A additionally refuses such a Bite as a seed; Entry B does not. | `restaurant-candidate-store.ts`, `getMatchingBites`; `create-restaurant-candidate-on-bite-create.ts` |
| **R-5** | Whether a place is already a Restaurant, and whether it is already a Candidate, are both decided by **fuzzy name plus distance and nothing else**. Neither a Restaurant nor a Candidate carries an external place identity, so neither check can be made exact. | `restaurant-candidates.ts`, `findVerifiedRestaurantDuplicate`, `findPendingRestaurantCandidateDuplicate` |
| **R-6** | Detection's entire effect is **one merge write of one `/restaurantCandidates` document**. It writes no Bite, no Restaurant and no Menu, and per `RD-VRC-9` it must never become a writer of `bite.restaurantId`. | both producers, `candidateRef.set(update, { merge: true })` |
| **R-7** | A Candidate's identity is **derived from its content**: the normalized name with non-alphanumerics collapsed to `-` and capped at 80 characters, plus the first **7** geohash characters — a cell of roughly 150 m against a 200 m radius. A Candidate therefore has no identity independent of the evidence that produced it. | `restaurant-candidate-store.ts`, `buildRestaurantCandidateDocumentId` |
| **R-8** | *Intended, not met.* A write onto a Candidate that is not `pending` is refused and logged. Today `status: 'pending'` is written unconditionally and the target's current status is never read, so a `verified` or `dismissed` Candidate is silently reset. This is `K9`. | `restaurant-candidate-store.ts`, `buildCandidateUpdate` |
| **R-9** | `name`, `normalizedName`, `position` and `geohash` are **first-writer-wins**. The name is a majority vote of Bite place strings taken at first clustering and then frozen, and it feeds `R-7`'s document id — so the earliest few Bites' spelling fixes both the name and the identity permanently. | `restaurant-candidate-store.ts`, `buildCandidateUpdate` |
| **R-10** | `evidence.biteCount` is the size of the **union** of `biteIds`, while `evidence.placeNames`, `averageRating` and `imagePaths` describe **only the current run's** matched Bites. The count and the histogram beside it therefore describe different sets, and only the count grows monotonically. | `restaurant-candidate-store.ts`, `buildCandidateUpdate`; `restaurant-candidates.ts`, `aggregateRestaurantCandidateEvidence` |
| **R-11** | *Intended, not met.* A Candidate reflects the Bites that currently support it. Today only Bite **creation** triggers detection and `biteIds` only ever grows: editing a place name never lets a Bite join or leave a cluster, deleting a Bite never shrinks one, and detaching a Bite from a Restaurant returns it to the unverified pool with nothing to re-run. There is no re-evaluation path at all, so `evidence.biteCount` drifts upward from reality and `R-2` stops holding for existing documents. | `create-restaurant-candidate-on-bite-create.ts`, `onDocumentCreated`; `buildCandidateUpdate` |
| **R-12** | Entry B's authorization is enforced in the backend on the verified ID token, inside App Check. `B3`'s eligibility list is a convenience, not a gate. | `shared/roles.ts`, `requireAdmin`; `shared/callable-options.ts`, `onAppCheck` |
| **R-13** | Entry B's definition of *clusterable* lives **in the client**: a `computed` over a resource that reads the whole `/bites` collection, capped at **50** Bites in read order with no defined ordering. The rule that decides what may be clustered is therefore not next to the rules that do the clustering. | `migrations-data-access.service.ts`, `getRestaurantClusteringEligibleBites`, `RESTAURANT_CLUSTERING_ELIGIBLE_BITES_LIMIT` |
| **R-14** | A geohash bounds query that fails is logged and yields no documents rather than failing the flow. For `/restaurants` this falls back to reading the **entire** collection; for `/bites` and `/restaurantCandidates` it silently reduces the evidence and weakens the duplicate checks. | `restaurant-candidate-store.ts`, `queryCollectionByGeohashBounds`, `getNearbyVerifiedRestaurants` |
| **R-15** | Detection never consults an external place directory. Google Places is used for prefill only **after** an Operator has opened the new-restaurant form, in `UC-VRC` `V7`. Nothing ever asks whether a business exists at a coordinate. | `new-restaurant.service.ts`, `searchPrefillPlaces` |
| **R-16** | The only clustering signal is `bite.place`, a free-text string that may be typed, taken from a Google place, or taken from a picked Restaurant. Normalization folds case, accents, `&` and punctuation, and nothing else — not abbreviations, not word order, not a place type. | `restaurant-candidates.ts`, `normalizePlaceName`, `getPlaceNameMatchScore` |
| **R-17** | A Candidate makes no statement about *why* it is credible. Entry A's Candidate asserts that five people independently named the place; Entry B's asserts that one Operator believes it. Both are the same shape in the same collection with the same `status`, and `evidence.biteCount` is read as a proxy for a claim it does not make. `G7` is the invariant that would fix this. | `model/restaurant-candidate.ts`, both copies |

## Exceptions And Failure Modes

| # | Situation | Behaviour | Assessment |
|---|---|---|---|
| E1 | The derived id at `K8` already points to a `verified` or `dismissed` Candidate | `K10` merge-writes `status: 'pending'` onto it. The Candidate is reset, reappears in `UC-VRC`'s list and can be verified a second time, producing a duplicate Restaurant | **Defect.** `R-8`'s guard is the fix. `UC-VRC` `E9` is the same defect seen from the other end |
| E2 | Two different restaurants share a normalized name inside one geohash cell | One Candidate, holding both places' Bites as evidence for one another | **Defect,** and a direct consequence of `R-7` |
| E3 | One restaurant's Bites straddle a geohash cell boundary | Two Candidates for one place. `K7`'s pending-duplicate lookup mitigates this only when the second cluster's bounds happen to reach the first document | **Defect,** same root cause as `E2`. A ~150 m cell against a 200 m radius makes it likely rather than exceptional |
| E4 | A Bite's `place` is corrected after creation | Nothing happens. The Bite never joins the cluster it now names, and never leaves the one it no longer names | **Gap.** `R-11` |
| E5 | An evidence Bite is deleted | `biteIds` and `biteCount` keep counting it. `UC-VRC` `V18` skips it at verification time, so the Candidate is verified on evidence that no longer exists | **Gap.** `R-11` |
| E6 | A Bite is detached from its Restaurant | It returns to the unverified pool and becomes eligible again, but nothing re-runs detection for it | **Gap.** `R-11` |
| E7 | Entry B is called for a Bite that already carries `restaurantId` | `B8` accepts it, `K4` then drops it as evidence, and with no other match `K5` waves through a draft with **zero** Bites: a Candidate with `biteCount: 0` and the seed Bite's name and position. Unreachable through `B3`, reachable through the callable | **Defect.** Entry B is missing `A3`'s seed check |
| E8 | Five Bites at a festival stand, a home kitchen, an office canteen or a supermarket deli | Cluster exactly like a restaurant. There is no place type and no negative evidence; dismissal records "not a restaurant" only after a human looked, and nothing feeds that back into detection | **Gap.** Detection has no notion of what a restaurant is |
| E9 | "Da Mario" and "Ristorante Da Mario" at one address | Score below 0.82, so two clusters that never merge — and by `R-9` whichever spelling clustered first owns the name and the id forever | **Gap.** `R-16` |
| E10 | A verified Restaurant was renamed, or two branches of one business sit within 200 m | `K3` misses, and detection creates a Candidate for a place that is already a Restaurant | **Defect,** and the root cause of `E1` rather than a coincidence. `R-5` |
| E11 | The `/restaurants` bounds query fails, or no Restaurant carries a `geohash` | The entire `/restaurants` collection is read and then filtered by radius. Correct, and unbounded | **Defect,** growing with the collection. `R-14` |
| E12 | More than 50 Bites are eligible for Entry B | Only the first 50 in read order are offered, with no defined ordering, so the same Bites are likely offered every time | **Defect.** `R-13`, and the same shape as `UC-VRC` `E8` |
| E13 | A thin market: a real restaurant never reaches five Bites | Entry A never fires. Entry B is the only route, which makes the threshold-free producer load-bearing rather than exceptional | **Gap.** Neither constant has a recorded rationale, and by `R-11` changing either has no effect on existing data |

## Authorization

**Entry A is not authorized, because it has no caller.** It executes in the Functions
runtime with administrative credentials, is reachable only by writing a Bite, and per
`R-6` its only privilege is to write one Candidate document.

**Entry B is enforced.** `requireAdmin` runs on the verified ID token inside App Check
at `B5`. A `business` account and a plain Bite Creator both receive `permission-denied`;
an unauthenticated caller receives `unauthenticated`. The route guard behind `B2` and
the eligibility filter at `B3` are conveniences.

**Not enforced.** `firestore.rules` grants read and write on every document to every
authenticated user, so nothing stops a signed-in Bite Creator from writing a
`/restaurantCandidates` document directly — with any `evidence`, any `biteIds` and any
`status`. Every invariant on this page is a property of *this code*, not of the
collection. `B3`'s whole-collection read of `/bites` depends on the same openness.
Owned by \#1078.

## App Store Review Area

**Direct relevance: none,** because detection has no user-facing surface in a reviewed
app. Entry A runs in the backend and is invisible; Entry B lives in the Admin App, which
is a web app, is `noindex, nofollow`, and does not go through Apple or Google review. No
native capability is used, so no Capacitor permission and no Privacy Nutrition Label
entry changes.

**Indirect relevance.** Two questions this Use Case creates for the consumer app, which
*is* reviewed:

1. **Creating a Bite silently produces a record about a third-party business.** A Bite
   Creator's free-text place name and precise position become evidence in a document
   they never see and cannot correct, which by `R-9` may fix that business's name in
   BiteTribe permanently. Location is already declared for Bite creation, so nothing in
   the declarations changes; the question is disclosure, not permission.
2. **A private place can become a public one.** By `E8` detection cannot tell a home
   kitchen or an office canteen from a restaurant, and after verification such a place
   becomes a public Restaurant page at someone's home address. Detection is where that
   record starts existing; publication belongs to `UC-VRC` `V21`.

Neither blocks the current release candidate. Both are recorded here so they are not
discovered in review.

---

## Recorded Decisions

Taken on 7 September 2026.

| # | Decision |
|---|---|
| `RD-DRC-18` | **Detection is one Use Case with two entries and one shared kernel,** not two Use Cases. Entry A has no human actor and Entry B is Operator work, which is the argument for splitting; the argument that wins is that both execute the same clustering code, so `R-1`, `R-5`, `R-7`, `R-8`, `R-9` and `R-10` would have to be stated twice and kept in agreement by hand. `K5` is the only step whose behaviour differs by entry, which makes `RD-VRC-10` one gated step instead of a fact duplicated across two pages |

`RD` ids are **page-scoped**: the prefix names the owning page, so `RD-UR-6` and
`RD-VRC-6` are different decisions. Numbers are historical and need not be contiguous.

## Related Domains

- [[Restaurant]]
- [[Bite]]

## Related Pages

- [[UC - Verify Restaurant Candidate]]
- [[UC - Operate BiteTribe In The Admin App]]
- [[UC - Run Operational Migrations]]
- [[UC - Create And Maintain Personal Bites]]
- [[Implementation - Firebase Functions]]
- [[User Roles]]
- [[Restaurant]]
