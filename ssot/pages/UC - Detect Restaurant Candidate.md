# UC - Detect Restaurant Candidate

## Status

**Level:** L2.

Implemented and in use, with **two producers**: an automatic Firestore trigger on Bite
creation, and an Operator-initiated callable `clusterRestaurantCandidateForBite`, which is
`admin`-gated since issue \#1472 and surfaced in `bite-tribe-admin` since issue \#1473.
Both converge on one shared clustering kernel; per `RD-VRC-8` this Use Case owns both, and
per `RD-DRC-18` they are one page rather than two. `RD-DRC-19` records that the automatic
producer is a mechanism rather than an entry, because it has no actor.

The kernel is complete and the collection's invariants are not. Nothing records which
producer created a Candidate, nothing guards a write onto a Candidate that has already been
decided, and nothing re-evaluates a cluster after the Bites underneath it change. Work in
flight: epic \#1495 for verification's half, epic \#1523 for this page's own.

| Aspect                                                      | State                                                                                                                                                                                                                                    |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Automatic detection `createRestaurantCandidateOnBiteCreate` | Implemented                                                                                                                                                                                                                              |
| On-demand callable `clusterRestaurantCandidateForBite`      | Implemented, `admin`-gated                                                                                                                                                                                                               |
| Shared clustering kernel `K1`–`K10`                         | Implemented, except `K9`                                                                                                                                                                                                                 |
| `K9` — guard against writing onto a non-`pending` Candidate | Not implemented. `R-8`                                                                                                                                                                                                                   |
| Producer marker on the Candidate                            | Not implemented: no field exists in either model copy, so `R-19` cannot be met                                                                                                                                                           |
| Re-evaluation after a Bite is edited, deleted or detached   | Not implemented, and not designed. `R-11`                                                                                                                                                                                                |
| The on-demand seed check                                    | Missing: `B8` accepts a Bite that already belongs to a Restaurant. `E7`                                                                                                                                                                  |
| Candidate identity                                          | Derived from content, so one place can split into two Candidates and two places can share one. `R-7`, `E2`, `E3`                                                                                                                         |
| The on-demand producer's eligible-Bite list                 | Implemented in the client, over the whole `/bites` collection. `R-13`                                                                                                                                                                    |
| Authorization at the data layer                             | Closed in the repository by #1078: `restaurantCandidates` is readable and client-writable by nobody, so the collection is written only by the clustering trigger and the verification callable. Live once the rules are deployed by hand |

## Goal

Repeated Bites at one place become **one** `pending` RestaurantCandidate — a claim, not a
fact, and the only input `UC - Verify Restaurant Candidate` accepts.

Detection decides nothing. It writes a single document and stops; every consequence of that
document — a Restaurant, a Menu, a Bite gaining a `restaurantId` — belongs to `UC-VRC`.
This page states the whole of _how a Candidate comes into existence_, so that the two
producers' one real difference is visible in one place instead of being duplicated across
two documents.

## Actors

The authorization vocabulary is defined in [[User Roles]].

- **BiteTribe Operator** (short: _Operator_), holding the `admin` claim. The only actor,
  lane `OP`, and only in the on-demand producer.
- **Bite Creator** — **not an actor.** Creating a Bite is the _cause_ of automatic
  detection, not a participation in it: the Bite Creator makes no decision here, is never
  notified, sees no state change, and cannot observe the Candidate their Bite became
  evidence for.
- **Restaurant Owner** — no part in this Use Case.

**Automatic detection has no actor at all.** It runs in the Functions runtime with
administrative credentials, is not callable from any client, and no human is in the loop.
That is why it is written as a mechanism and not as an entry (`RD-DRC-19`), and it is the
argument that made `RD-DRC-18` a real decision rather than a formality.

## Lanes

| Code  | Kind   | Binding                                               |
| ----- | ------ | ----------------------------------------------------- |
| `OP`  | actor  | BiteTribe Operator, `admin` claim, per [[User Roles]] |
| `UI`  | system | `bite-tribe-admin`, the Admin App (Angular)           |
| `SYS` | system | Cloud Functions; the function is named at the step    |
| `DB`  | system | Firestore                                             |

`NAT` is not used: the Admin App is a web app and touches no native capability. `EXT` is
not used: detection consults no third party, which is `R-15`.

## Aggregate

`RestaurantCandidate`, in `/restaurantCandidates`. States it can be left in: `absent`,
`pending`, `verified` and `dismissed`.

Detection writes exactly one status, `pending`. It leaves a Candidate `verified` or
`dismissed` only at `END-K5`, by refusing to write onto one — so those two are states this
flow can leave behind without ever producing them. That refusal is `R-8` and is not built,
which is `E1`. `merged` was a fifth declared status and is removed from both model copies by
`RD-VRC-7`, owned by \#1499.

`absent` is where every unsuccessful path leaves the aggregate: no Candidate is created and
none is modified.

## Scope

In scope: everything that results in a document under `/restaurantCandidates`. Both
producers, the shared clustering kernel, the constants that govern it, the document
identity, and the merge semantics of a repeated detection.

**Completeness.** `/restaurantCandidates` is written by exactly four things. This Use Case
creates every Candidate, through both producers, at `K10`. `UC-VRC` writes the verification.
`UC-DIS` would write `dismissed` and today has no writer. `UC-MRC` would write the duplicate
resolution and today has no writer. Excluded: any signed-in client, which
`firestore.rules` refuses since \#1078 — a boundary now enforced where the data lives,
stated once under `Authorization`.

Out of scope. Each of these is its own Use Case, referenced from the step it belongs to:

| UC-ID    | Use Case                                    | Referenced at | Direction                                                                                                        |
| -------- | ------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------- |
| `UC-VRC` | [[UC - Verify Restaurant Candidate]]        | `K10`         | Downstream, and the sole consumer of what this Use Case produces                                                 |
| `UC-CMB` | [[UC - Create And Maintain Personal Bites]] | `A2`          | Upstream cause of automatic detection                                                                            |
| `UC-OPS` | [[UC - Operate BiteTribe In The Admin App]] | `B1`          | Enclosing: sign-in and the role gate                                                                             |
| `UC-ROM` | [[UC - Run Operational Migrations]]         | `B2`          | Enclosing: the surface the on-demand producer is offered on                                                      |
| `UC-DIS` | Dismiss Restaurant Candidate                | `K9`          | Alternative downstream outcome, and — once #1497 and #1501 land — detection's only negative evidence. See `R-18` |

**Also out of scope, and not a Use Case: the Bite-places creation path.** The Admin App
offers a list of distinct `place` strings taken from all Bites; picking one opens the same
new-restaurant form used by verification, seeded with `position: {latitude: 0, longitude:
0}` and **no** `restaurantCandidateId`. Submitting without one bypasses the verification
callable entirely and creates a Restaurant through five separate client-side writes with no
transaction and no backend validation. It is a second, Candidate-free route to a
Restaurant. It is not detection, it produces no Candidate, and this Use Case states no rule
about it.

Whether it is retired is an open question rather than a settled one, and it is carried in
[[Current State - Open Questions]] because it is a release decision: with the on-demand
producer classified `[Secondary]`, that path is the only route to a Restaurant for a place
that never reaches `R-2`'s threshold.

## Trigger

**Automatic detection:** the creation of a document under `bites/{biteId}`, by any writer.
There is no trigger on update and none on delete, which is `R-11`.

**On demand:** an Operator deciding to cluster one specific Bite. There is no schedule and
no batch run.

## Preconditions

| #   | Precondition                                                                                                    | Owner    |
| --- | --------------------------------------------------------------------------------------------------------------- | -------- |
| P1  | At least one `/bites/{biteId}` exists carrying a non-empty `place` and a `position` with two finite coordinates | `UC-CMB` |
| P2  | Bite documents carry a `geohash`, or the bounds query that finds them returns nothing. `R-14`                   | `UC-CMB` |
| P3  | _On demand only._ The acting account holds the `admin` claim and is signed into the Admin App                   | `UC-OPS` |
| P4  | _On demand only._ The client holds a valid App Check token                                                      | Platform |

**Not a precondition:** that no Candidate and no Restaurant exists for the place. Both are
checked inside the kernel, at `K3` and `K8`, and both checks are fuzzy — see `R-5`.

**Handshake.** `AF-31` is satisfied: every `REF:` and every precondition names its
counterparty and the guarantee that counterparty owes. `AF-34` is closed in both
directions with `UC-VRC` only: `G2` names `UC-VRC` `P1` and `P2`, and those name this Use
Case as owner. `UC-CMB`, `UC-OPS` and `UC-ROM` are L1 pages carrying no numbered
guarantees, and `UC-DIS` has no page at all, so `P1`, `P2`, `P3`, the `B2` reference and
the `K9` reference are **unanswered** under `AF-34` rather than failures. Those four are a
claim on `UF-20`'s migration order; they are not a precondition of this page reaching L3.

## Guarantees

On the successful path, `END-K4`:

| #   | Guarantee                                                                                                                                                                              |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | Exactly one document under `/restaurantCandidates` is written, and it carries `status == 'pending'`                                                                                    |
| G2  | It carries `name`, `normalizedName`, `position`, `geohash`, `biteIds` and `evidence`, satisfying `UC-VRC` `P1` and `P2`                                                                |
| G3  | The document id is a pure function of the normalized name and the geohash bucket, so repeated detection of the same place converges on one document instead of accumulating duplicates |
| G4  | No Bite is written. Detection is never a writer of `bite.restaurantId` (`RD-VRC-9`)                                                                                                    |
| G5  | No Restaurant and no Menu is created, and no existing Restaurant is modified                                                                                                           |
| G8  | Atomicity is per document and nothing more. One merge write is the entire effect; there is no transaction, because there is nothing else to keep consistent with it                    |

`G6` is **retired** and its number is not reused. It guaranteed that `biteIds` is a union
with what the document already held and therefore never shrinks — which is the defect
`R-11` describes, not a property worth keeping.

`G7` is **retired** and its number is not reused. A guarantee is true at the success
terminal state and nowhere else (`UF-4`), and _Intended, not met_ is a marking for a rule
rather than for a guarantee (`AF-33`). As written, `END-K4` claimed `G7` held while `G7`
itself said it did not. Its content is now `R-19`.

## Actogram

The flow below is a text actogram; the notation is defined in [[Actogram Format]].

One entry, step-id prefix `B`, on the on-demand producer. `A*` is the automatic-detection
mechanism, which has no actor and is therefore not an entry (`AF-4`, `RD-DRC-19`); `K*` is
the clustering kernel both producers execute. A step written `K5` is reached from both, and
where its behaviour differs it says so with an `ENTRY:` line.

`A1` and `K7` are **retired** and their ids are not reused. `A1` was a lane-less step
standing for the creation of a Bite, which `AF-5` does not permit; its cause is `P1` and its
reference now sits on `A2`. `K7` had both a branch set and a successor with both arms
sharing a target, which `AF-9` and `AF-25` do not permit; the pending-duplicate lookup it
performed is an effect of `K8`.

No step carries an `@` locus. `AF-12` is a `SHOULD` at L2 and a `MUST` at L3; the loci
arrive with the L3 verification pass, together with the provenance line, so that no anchor
on this page is an unverifiable claim.

### Phase 1 - Clustering a Bite on demand

```
B1   OP   signs into the Admin App
          REF:UC-OPS   the `admin` claim is verified before a session exists
          → B2

B2   OP   opens the operational migrations surface
          REF:UC-ROM   the surface offers restaurant clustering to an Operator
          → B3

B3   UI   computes the eligible-Bite list, client-side
          └─→ UI   reads DB  /bites                        (whole collection)
          └─→ UI   reads DB  /restaurantCandidates  where status == 'pending'
          └─→ UI   keeps Bites with no restaurantId, not already in a pending
                   Candidate, with a non-empty place and a finite position,
                   then takes the first 50 in read order
          └─◁ OP   sees a list of Bites that may be clustered, with no
                   indication that a limit is in force
          INV:R-13
          → B4

B4   OP   judges whether a listed Bite is worth clustering       [decision]
          BASIS: the Bite's place name, its position and its dish, as the list
                 renders them. The list shows no other Bite at the same place,
                 so the Operator cannot see how much evidence exists — which is
                 what makes RD-VRC-10's safeguard rest on judgement alone
          ├─ clusters one Bite   → B4a
          └─ leaves without clustering → END-B7

B4a  OP   asks for a Candidate for that Bite
          └─→ SYS  calls clusterRestaurantCandidateForBite { biteId }
          → B5
```

### Mechanism - on-demand clustering

```
B5   SYS  enforces the caller's identity
          INV:R-12
          ├─ no App Check token      → END-B1
          ├─ not authenticated       → END-B2
          ├─ authenticated, no admin → END-B3
          └─ admin                   → B6

B6   SYS  validates the request
          ├─ biteId is not a non-empty string → END-B4
          └─ valid                            → B7

B7   SYS  reads the Bite
          └─→ DB   /bites/{biteId}
          ├─ does not exist → END-B5
          └─ exists         → B8

B8   SYS  checks whether the Bite is usable as a seed
          INV:R-4 is VIOLATED here: unlike A3, this step does not reject a
               Bite that already carries a restaurantId. The client filters
               those out of B3, but the callable accepts one. See E7
          ├─ place is empty, or position is absent or not finite
          │                → END-B6
          └─ usable        → K1
```

### Mechanism - automatic detection

```
A2   SYS  the trigger fires on bites/{biteId}
          └─→ SYS  reads the Bite from the event snapshot, not from DB
          REF:UC-CMB   the Bite carries `place` and `position` as the Bite
                       Creator entered or picked them; detection adds no
                       validation of its own
          ├─ no snapshot on the event  → END-A1   (logged, no-op)
          └─ snapshot present          → A3

A3   SYS  checks whether the Bite is eligible as a seed
          INV:R-4
          NOTE: an ineligible seed is logged and nothing else records that
                detection considered it
          ├─ not eligible: it already carries a restaurantId, or its place is
          │  empty or whitespace, or its position is absent or either
          │  coordinate is not finite                          → END-A1
          └─ eligible                                          → K1
```

### Mechanism - shared clustering

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
          └─→ SYS  a bounds query that fails is logged and yields no
                   documents; for /restaurants only, the whole collection is
                   read instead
          INV:R-14
          INV:R-2   the seed Bite counts as its own evidence
          → K3

K3   SYS  looks for a Restaurant that is already this place
          └─→ SYS  matches within 200 m and at a name score of at least 0.82
          INV:R-5
          ENTRY:A  the match is logged and nothing is returned
          ENTRY:B  the Restaurant id is returned to the Operator
          ├─ match, automatic → END-K1
          ├─ match, on demand → END-K2
          └─ no match         → K4

K4   SYS  matches the nearby Bites against the seed
          └─→ SYS  drops a Bite with no position, a Bite already carrying a
                   restaurantId, a Bite further than 200 m, and a Bite whose
                   place scores below 0.82
          INV:R-4
          INV:R-16
          ENTRY:B  each reason for dropping is counted and returned
          ENTRY:A  the counts are discarded
          → K5

K5   SYS  applies the evidence threshold
          INV:R-2
          ENTRY:A  fewer than five matched Bites ends the run
          ENTRY:B  no threshold applies, by RD-VRC-10: the Operator's
                   deliberate action is the safeguard, and the count is
                   returned so that it is visible
          ├─ automatic, fewer than 5 matched Bites → END-K3
          └─ otherwise                             → K6

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
          → K8

K8   SYS  determines the target document id
          └─→ SYS  looks for a nearby Candidate for the same place; only
                   status == 'pending' qualifies, the best name score wins,
                   then the shortest distance
          └─→ SYS  the found duplicate's id, or the derived id: the
                   normalized name with non-alphanumerics collapsed to `-`
                   and capped at 80 characters, plus the first 7 geohash
                   characters
          INV:R-7
          INV:R-17
          → K9

K9   SYS  refuses a write onto a target that is not `pending`  [not implemented]
          REF:UC-DIS   must leave a Candidate `dismissed`, which is the only negative
                       evidence detection has: a dismissed document occupying the
                       derived id is what this step refuses every later write onto
          INV:R-8 is VIOLATED here: this step does not exist in the code.
               The write at K10 is unconditional, so a target that is
               `verified` or `dismissed` is reset to `pending`. See E1
          ├─ target exists and status != 'pending' → END-K5
          └─ target is absent or `pending`          → K10

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
          REF:UC-VRC   the Candidate is the only input verification accepts,
                       and every consequence of it belongs there
          INV:R-6
          INV:R-9
          INV:R-10
          → END-K4
```

### Terminal States

| End      | Kind        | Aggregate state                      | Perception                                                                                                                                              | Meaning                                                                                                                       |
| -------- | ----------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `END-A1` | Abort       | `absent`                             | None — no actor is in the flow                                                                                                                          | The Bite is not an eligible seed. No Candidate, and no record that detection considered it beyond a log line                  |
| `END-B1` | Rejection   | `absent`                             | The Operator is told the request could not be made, with nothing suggesting the Bite was at fault                                                       | App Check                                                                                                                     |
| `END-B2` | Rejection   | `absent`                             | The Operator is asked to sign in again                                                                                                                  | `unauthenticated`                                                                                                             |
| `END-B3` | Rejection   | `absent`                             | The Operator is told their account may not cluster, and that signing in again will not help                                                             | `permission-denied`                                                                                                           |
| `END-B4` | Rejection   | `absent`                             | The Operator is told the request was malformed, and the Bite is unchanged                                                                               | `invalid-argument`, `biteId`                                                                                                  |
| `END-B5` | Rejection   | `absent`                             | The Operator is told the Bite no longer exists, and it is gone from the list on reload                                                                  | `not-found`                                                                                                                   |
| `END-B6` | Rejection   | `absent`                             | The Operator is told the Bite cannot seed a cluster, because it names no place or has no position                                                       | `failed-precondition`                                                                                                         |
| `END-B7` | Abort       | `absent`                             | The Operator leaves the surface with nothing changed; no draft exists to discard                                                                        | Deferred or abandoned. No side effect                                                                                         |
| `END-K1` | Hand-over   | `absent`                             | None — no actor is in the flow                                                                                                                          | A verified Restaurant is already this place. No Candidate. The Bite stays unlinked, so nothing connects it to that Restaurant |
| `END-K2` | Hand-over   | `absent`                             | The Operator is told the place already has a verified Restaurant, and which one — distinguishable from nothing having happened                          | `verifiedRestaurantId` and `status: 'verified-restaurant-match'` are returned. Still no Candidate and still no link           |
| `END-K3` | Abort       | `absent`                             | None — no actor is in the flow                                                                                                                          | Below the evidence threshold. No Candidate. Nothing remembers the near-miss, so the next Bite recomputes it from scratch      |
| `END-K4` | **Success** | `pending`                            | On demand, the Operator is told a pending Candidate now exists and can find it in the verification queue. Automatically, none — no actor is in the flow | `G1` to `G5` and `G8` hold. Hands over to `UC-VRC` `P1`                                                                       |
| `END-K5` | Refusal     | `verified` or `dismissed`, unchanged | The Operator is told the place has already been decided, and which way                                                                                  | `R-8`'s guard refuses the write. Not implemented: today this path leads to `END-K4` on top of an already decided Candidate    |

Every perception above is **as-agreed, not observed**. They state what the surface must
leave the Operator with; whether it does is an L3 question.

## Rules And Invariants

| ID       | Normative statement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **R-1**  | The clustering radius is **200 m** and the minimum place-name match score is **0.82**. Both bind both producers, and both are used for three different questions: matching a Bite, matching a verified Restaurant, and matching a pending Candidate.                                                                                                                                                                                                                                                           |
| **R-2**  | The evidence threshold is **five matching Bites** and applies to **automatic detection only** (`RD-VRC-10`). The seed Bite is forced into the neighbourhood result and matches itself, so five means the seed plus four others.                                                                                                                                                                                                                                                                                |
| **R-3**  | _Intended, not met._ The threshold and the score are each declared once. `0.82` exists twice, in two files, with nothing checking that they agree.                                                                                                                                                                                                                                                                                                                                                             |
| **R-4**  | A Bite that already carries `restaurantId` is never evidence, in either producer. Automatic detection additionally refuses such a Bite as a seed; the callable does not, which is `E7`.                                                                                                                                                                                                                                                                                                                        |
| **R-5**  | Whether a place is already a Restaurant, and whether it is already a Candidate, are both decided by **fuzzy name plus distance and nothing else**. Neither a Restaurant nor a Candidate carries an external place identity, so neither check can be made exact.                                                                                                                                                                                                                                                |
| **R-6**  | Detection's entire effect is **one merge write of one `/restaurantCandidates` document**. It writes no Bite, no Restaurant and no Menu, and per `RD-VRC-9` it must never become a writer of `bite.restaurantId`.                                                                                                                                                                                                                                                                                               |
| **R-7**  | A Candidate's identity is **derived from its content**: the normalized name plus the first **7** geohash characters — a cell of roughly 150 m against a 200 m radius. A Candidate therefore has no identity independent of the evidence that produced it, which is why one place can split into two Candidates and two places can share one.                                                                                                                                                                   |
| **R-8**  | _Intended, not met._ A write onto a Candidate that is not `pending` is refused and logged. Today `status: 'pending'` is written unconditionally and the target's current status is never read, so a `verified` or `dismissed` Candidate is silently reset. This is `K9`.                                                                                                                                                                                                                                       |
| **R-9**  | `name`, `normalizedName`, `position` and `geohash` are **first-writer-wins**. The name is a majority vote of Bite place strings taken at first clustering and then frozen, and it feeds `R-7`'s document id — so the earliest few Bites' spelling fixes both the name and the identity permanently.                                                                                                                                                                                                            |
| **R-10** | `evidence.biteCount` is the size of the **union** of `biteIds`, while `evidence.placeNames`, `averageRating` and `imagePaths` describe **only the current run's** matched Bites. The count and the histogram beside it therefore describe different sets.                                                                                                                                                                                                                                                      |
| **R-11** | _Intended, not met._ A Candidate reflects the Bites that currently support it. Today only Bite **creation** triggers detection and `biteIds` only ever grows: editing a place name never lets a Bite join or leave a cluster, deleting a Bite never shrinks one, and detaching a Bite from a Restaurant returns it to the unverified pool with nothing to re-run. There is no re-evaluation path at all, so `evidence.biteCount` drifts upward from reality and `R-2` stops holding for existing documents.    |
| **R-12** | The on-demand producer's authorization is enforced in the backend on the verified ID token, inside App Check. `B3`'s eligibility list is a convenience, not a gate.                                                                                                                                                                                                                                                                                                                                            |
| **R-13** | The on-demand producer's definition of _clusterable_ lives **in the client**: a `computed` over a resource that reads the whole `/bites` collection, capped at **50** Bites in read order with no defined ordering. The rule that decides what may be clustered is therefore not next to the rules that do the clustering.                                                                                                                                                                                     |
| **R-14** | A geohash bounds query that fails is logged and yields no documents rather than failing the flow. For `/restaurants` this falls back to reading the **entire** collection; for `/bites` and `/restaurantCandidates` it silently reduces the evidence and weakens the duplicate checks, so a failed query is not a degraded answer but a different, wrong one.                                                                                                                                                  |
| **R-15** | Detection never consults an external place directory. Google Places is used for prefill only **after** an Operator has opened the new-restaurant form, in `UC-VRC`. Nothing ever asks whether a business exists at a coordinate.                                                                                                                                                                                                                                                                               |
| **R-16** | The only clustering signal is `bite.place`, a free-text string that may be typed, taken from a Google place, or taken from a picked Restaurant. Normalization folds case, accents, `&` and punctuation, and nothing else — not abbreviations, not word order, not a place type.                                                                                                                                                                                                                                |
| **R-17** | A Candidate makes no statement about _why_ it is credible. An automatically detected Candidate asserts that five people independently named the place; an Operator-created one asserts that one Operator believes it. Both are the same shape in the same collection with the same `status`, and `evidence.biteCount` is read as a proxy for a claim it does not make. `R-19` is the invariant that would fix this.                                                                                            |
| **R-18** | _Intended, not met._ A place an Operator has dismissed is not proposed again. Once `R-8`'s guard exists, a `dismissed` document occupying the derived id refuses every later write, which makes dismissal detection's only negative evidence and its only permanent suppression — the one thing that answers `E8` at all. The suppression is only as durable as `R-7`'s identity, so a spelling variant or a cell boundary defeats it.                                                                         |
| **R-19** | _Intended, not met._ Every Candidate written since the producer field exists is either backed by at least five matching Bites within 200 m, or marked as created by an Operator (`RD-VRC-10`). No field records the producer yet, so the second half is unrepresentable, and the Candidates that predate the field carry `unknown` permanently: their producer was never recorded and cannot be recovered, which is a permanent exception rather than a temporary state. This was `G7` until `G7` was retired. |

## Exceptions And Failure Modes

| #   | Situation                                                                               | Behaviour                                                                                                                                                                                                                                              | Assessment    |
| --- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- |
| E1  | The derived id at `K8` already points to a `verified` or `dismissed` Candidate          | `K10` merge-writes `status: 'pending'` onto it. The Candidate is reset, reappears in `UC-VRC`'s list and can be verified a second time, producing a duplicate Restaurant                                                                               | Defect, #1497 |
| E2  | Two different restaurants share a normalized name inside one geohash cell               | One Candidate, holding both places' Bites as evidence for one another, at a position that is the mean of both and may be on neither                                                                                                                    | Defect, #1526 |
| E3  | One restaurant's Bites straddle a geohash cell boundary                                 | Two Candidates for one place. `K8`'s pending-duplicate lookup mitigates this only when the second cluster's bounds happen to reach the first document                                                                                                  | Defect, #1525 |
| E4  | A Bite's `place` is corrected after creation                                            | Nothing happens. The Bite never joins the cluster it now names, and never leaves the one it no longer names                                                                                                                                            | Gap, #1527    |
| E5  | An evidence Bite is deleted                                                             | `biteIds` and `biteCount` keep counting it, so a Candidate can be verified on evidence that no longer exists                                                                                                                                           | Gap, #1527    |
| E6  | A Bite is detached from its Restaurant                                                  | It returns to the unverified pool and becomes eligible again, but nothing re-runs detection for it                                                                                                                                                     | Gap, #1528    |
| E7  | The callable is called for a Bite that already carries `restaurantId`                   | `B8` accepts it, `K4` then drops it as evidence, and with no threshold `K5` waves through a draft with **zero** Bites: a Candidate with `biteCount: 0` and the seed Bite's name and position. Unreachable through `B3`, reachable through the callable | Defect, #1524 |
| E8  | Five Bites at a festival stand, a home kitchen, an office canteen or a supermarket deli | Cluster exactly like a restaurant. There is no place type and no negative evidence; dismissal records "not a restaurant" only after a human looked, and `R-18` is the only thing that feeds it back                                                    | Gap, #1501    |
| E9  | "Da Mario" and "Ristorante Da Mario" at one address                                     | Score below 0.82, so two clusters that never merge — and by `R-9` whichever spelling clustered first owns the name and the id forever                                                                                                                  | Gap, #1525    |
| E10 | A verified Restaurant was renamed, or two branches of one business sit within 200 m     | `K3` misses, and detection creates a Candidate for a place that is already a Restaurant                                                                                                                                                                | Defect, #1522 |
| E11 | The `/restaurants` bounds query fails, or no Restaurant carries a `geohash`             | The entire `/restaurants` collection is read and then filtered by radius. Correct, and unbounded, on a path that runs on every Bite creation                                                                                                           | Defect, #1530 |
| E12 | More than 50 Bites are eligible for the on-demand producer                              | Only the first 50 in read order are offered, with no defined ordering, so the same Bites are offered every time and the rest are unreachable                                                                                                           | Defect, #1531 |

`E13` is **retired** and its id is not reused. It recorded that a real restaurant in a thin
market never reaches five Bites, which makes the threshold-free producer load-bearing. That
is a release decision rather than a defect, and it is carried in
[[Current State - Open Questions]], where it was settled on 9 September 2026: at over
3000 Bites the property already has places past the five-Bite threshold, so the
thin-market premise does not hold. The Bite-places path it depended on stays open there
as a cleanup decision.

## Authorization

**Automatic detection is not authorized, because it has no caller.** It executes in the
Functions runtime with administrative credentials, is reachable only by writing a Bite, and
per `R-6` its only privilege is to write one Candidate document.

**The on-demand producer is enforced.** `requireAdmin` runs on the verified ID token inside
App Check at `B5`. A `business` account and a plain Bite Creator both receive
`permission-denied`; an unauthenticated caller receives `unauthenticated`. The route guard
behind `B2` and the eligibility filter at `B3` are conveniences.

**Enforced at the data layer since \#1078.** `firestore.rules` makes
`/restaurantCandidates` readable by a signed-in account and client-writable by nobody, so
a Bite Creator can no longer write a Candidate with any `evidence`, any `biteIds` and any
`status`. The invariants on this page are now properties of the collection as well as of
this code. `B3`'s whole-collection read of `/bites` still works: reads were deliberately
left where they were, and \#1079 narrowed what the business app _lists_ in its own query
rather than in the rules. **The rules deploy by hand**, so this holds in production only
once `npx nx firebase-deploy-rules bite-tribe-firebase` has run.

## MVP Classification

**[MVP]** — automatic detection `A2` and `A3`, the shared kernel `K1` to `K10`, and the
terminal states `END-A1`, `END-K1`, `END-K3`, `END-K4` and `END-K5`. Automatic detection is
the only producer the initial release depends on.

**[MVP] and not implemented — release blocker under `UF-15`:**

- `K9`'s guard on a non-`pending` target (`R-8`, `E1`, \#1497). Without it a decided
  Candidate is reset and can be verified a second time, publishing a duplicate page about a
  real, named business. It is reachable by automatic detection alone, so it does not depend
  on the producer classified `[Secondary]` below.

**[Secondary]**

- `B1` to `B4a`, `B5` to `B8`, and the terminal states `END-B1` to `END-B7` — the on-demand
  producer. Operator tooling on a web app that is not store-reviewed; the release path is
  automatic detection.
- `B8`'s missing seed check (`R-4`, `E7`, \#1524). `[Secondary]` and unimplemented, so no
  release blocker under `UF-15`.
- `B3`'s ordering and cap (`R-13`, `E12`, \#1531).
- `R-11`'s re-evaluation (`E4`, `E5`, `E6`, \#1527 and \#1528).
- `R-7`'s identity (`E2`, `E3`, `E9`, \#1525 and \#1526).
- `R-14`'s bounded read (`E11`, \#1529 and \#1530).
- `R-3`'s single declaration (\#1532), and `R-19`'s producer marker (\#1500, \#1509, \#1533).

## App Store Review Area

**Direct relevance: none,** because detection has no user-facing surface in a reviewed app.
Automatic detection runs in the backend and is invisible; the on-demand producer lives in
the Admin App, which is a web app, is `noindex, nofollow`, and does not go through Apple or
Google review. No native capability is used, so no Capacitor permission and no Privacy
Nutrition Label entry changes.

**Indirect relevance.** Two questions this Use Case creates for the consumer app, which
_is_ reviewed:

1. **Creating a Bite silently produces a record about a third-party business.** A Bite
   Creator's free-text place name and precise position become evidence in a document they
   never see and cannot correct, which by `R-9` may fix that business's name in BiteTribe
   permanently. Location is already declared for Bite creation, so nothing in the
   declarations changes; the question is disclosure, not permission.
2. **A private place can become a public one.** By `E8` detection cannot tell a home kitchen
   or an office canteen from a restaurant, and after verification such a place becomes a
   public Restaurant page at someone's home address. Detection is where that record starts
   existing; publication belongs to `UC-VRC`.

Neither blocks the current release candidate. Both are recorded here so they are not
discovered in review.

## Related GitHub Scope

- Part of epic \#1523, which hardens this Use Case, and epic \#1495, which hardens
  verification and reaches into detection where verification trips over it.
- \#1497 — the guard at `K9`. `R-8`, `E1`. The release blocker on this page.
- \#1524 — the on-demand seed check. `B8`, `R-4`, `E7`.
- \#1525 — one place resolves to one Candidate across a spelling variant and a cell
  boundary. `R-7`, `E3`, `E9`, and what makes `R-18` durable.
- \#1526 — two places in one cell do not share a Candidate. `E2`.
- \#1527 — evidence stops counting Bites that no longer support it. `R-10`, `R-11`, `E4`,
  `E5`.
- \#1528 — a Bite whose eligibility changes re-enters detection. `R-11`, `E6`. Closes
  `R-11`.
- \#1529 — every Restaurant carries a `geohash`. The cause behind `E11`.
- \#1530 — the neighbourhood read is bounded and never silently partial. `R-14`, `E11`.
- \#1531 — the clustering queue shows unclustered places, ordered by evidence. `R-13`,
  `E12`.
- \#1532 — the clustering constants are each declared once. Closes `R-3`.
- \#1533 — every Candidate carries a producer value. The `unknown` set in `R-19`.
- \#1500 and \#1509 — the producer field and its rendering, in epic \#1495. `R-19`, `R-17`.
- \#1501 — dismissal, in epic \#1495. `R-18`, `E8`.
- \#1522 — detection recognises a verified place after a correction, in epic \#1495. `R-5`,
  `E10`.
- \#1499 — removes the `merged` status. `Aggregate`.
- \#1472 and \#1473 — the `admin` gate on the callable and its move into `bite-tribe-admin`.
  `B5`, `R-12`.
- \#1078 — ownership-scoped `firestore.rules`. Closed the "Not enforced" half of
  `Authorization`: `/restaurantCandidates` is now client-writable by nobody.

## Related Domains

- [[Restaurant]]
- [[Bite]]

## Related Pages

- [[Actogram Format]]
- [[Use Case Format]]
- [[Recorded Decisions]]
- [[UC - Verify Restaurant Candidate]]
- [[UC - Operate BiteTribe In The Admin App]]
- [[UC - Run Operational Migrations]]
- [[UC - Create And Maintain Personal Bites]]
- [[Implementation - Firebase Functions]]
- [[Current State - Open Questions]]
- [[User Roles]]
