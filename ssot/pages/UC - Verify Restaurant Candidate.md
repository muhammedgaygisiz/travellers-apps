# UC - Verify Restaurant Candidate

## Status

**Level:** L2.

Implemented and in use. The backend callable `verifyRestaurantCandidate` is
`admin`-gated since issue \#1472, and the Operator surface moved into
`bite-tribe-admin` with issue \#1473. Four referenced Use Cases this flow depends on
have no implementation — dismissal, duplicate resolution, owner assignment, and a
standalone writer for Bite assignment — and each is carried as a rule marked
*Intended, not met* rather than as an agreed step that quietly does not run. Work in
flight: epic \#1495.

| Aspect | State |
|---|---|
| Backend callable `verifyRestaurantCandidate` | Implemented, `admin`-gated |
| Operator surface (Candidate list, new-Restaurant form) | Implemented in `bite-tribe-admin` |
| `UC-GIM` — Initial Menu | Implemented, reachable only inside verification |
| `UC-ARB` — assign Bites | Reachable only inside verification; no standalone writer, see `R-8` |
| `UC-DIS` — dismiss | Not implemented, see `R-13` |
| `UC-MRC` — resolve a duplicate | Not implemented, see `R-14` |
| `UC-ARO` — assign owner | Not implemented, see `R-15` |
| Authorization at the data layer | Open; see `Authorization`. Owned by \#1078 |

## Goal

Repeated Bites at one place become a real, discoverable Restaurant through a single
deliberate human decision, made by a BiteTribe Operator, in one transaction that either
completes or changes nothing.

Everything the flow touches but does not own — detection, Bite assignment, Menu
generation, dismissal, duplicate resolution, ownership — is a referenced Use Case. This
page states *where* each reference sits and *what it must guarantee*, never how it
works, so that a defect is locatable in exactly one document.

## Actors

The authorization vocabulary is three roles, defined in [[User Roles]]. Only one of
them acts here.

- **BiteTribe Operator** (short: *Operator*), holding the `admin` claim. The only
  actor: it decides, completes the proposal and submits it. Lane `OP`.
- **Restaurant Owner** — not an actor here. Named because `V10` would assign one, and
  because the Restaurant this flow creates is the object `UC-MRB` hands them.
- **Bite Creator** — not an actor here: not notified, holding no rights, and seeing no
  state change beyond their Bite appearing under a Restaurant (`R-12`). Named because
  it is one of the four writers of `bite.restaurantId` (`R-8`).

**BiteTrail Creator is not a role** and has no part here. `RD-UR-4` retired it; it is
listed under *Not roles* in [[User Roles]].

**The role hierarchy is decided and not implemented.** `RD-UR-6` places the Operator
above the Restaurant Owner in capability: it may maintain every Restaurant, claimed or
unclaimed, without owning any — delivered through an Admin App restaurant-edit surface
plus an `admin` allowance in the ownership-scoped Firestore rules, never by granting
`business` and never by writing `Restaurant.ownerUserId`. In the code `admin` and
`business` are still deliberately *not* a hierarchy, so today an Operator cannot
maintain the Restaurant it just verified — which, by `G7`, also has no owner.
**Neither half of that delivery has an issue:** the rules half falls inside \#1078's
scope without being named there, and the edit surface is explicitly out of scope in
\#1510.

## Lanes

| Code | Kind | Binding |
|---|---|---|
| `OP` | actor | BiteTribe Operator, `admin` claim, per [[User Roles]] |
| `UI` | system | `bite-tribe-admin`, the Admin App (Angular) |
| `SYS` | system | Cloud Functions; the callable is named at the step |
| `DB` | system | Firestore |
| `EXT` | external | Google Places API |

`NAT` is not used: the Admin App is a web app and touches no native capability.

## Aggregate

`RestaurantCandidate`, in `/restaurantCandidates`. States it can be left in: `pending`,
`verified`, `dismissed`, `absent`.

`dismissed` is declared in the model and has no writer (`R-13`). `absent` is not written
by this Use Case; it is where a Candidate deleted between `V2` and `V15` leaves the flow,
at `END-E5`. `merged` was a fifth declared status and is removed from the model.

The Candidate also carries `skippedBiteIds` once verified, naming the evidence Bites
`V23` left untouched (`R-20`).

`/restaurants/{restaurantId}`, `/menus/{menuId}` and `bite.restaurantId` are written by
this flow but are not its aggregate: they are the effects of leaving the Candidate
`verified`, and their own lifecycles belong to `UC-MRB`, `UC-GIM` and `UC-ARB`.

## Scope

In scope: one Operator, one `pending` Candidate, one decision — verify. Correcting the
proposed Restaurant data, and the transactional creation of the Restaurant.

**Completeness.** `/restaurantCandidates` is written by exactly four things. `UC-DRC`
creates every Candidate, through both of its producers. This Use Case writes the
verification at `V24`. `UC-DIS` would write `dismissed` and today writes nothing
(`R-13`). `UC-MRC` would write the duplicate resolution and today writes nothing
(`R-14`). Excluded: any signed-in client, which can write the collection directly
because `firestore.rules` grants every authenticated user every write — that is an
unenforced boundary rather than a use case, is stated once under `Authorization`, and is
owned by \#1078.

Out of scope. Each of these is its own Use Case, referenced from the step it belongs to:

| UC-ID | Use Case | Referenced at | Direction |
|---|---|---|---|
| `UC-DRC` | [[UC - Detect Restaurant Candidate]] | `P1`, `P2` | Upstream, and the sole owner of every way a Candidate comes into existence — the automatic trigger *and* the Operator's on-demand clustering callable |
| `UC-DIS` | Dismiss Restaurant Candidate | `V4a` | Alternative outcome |
| `UC-MRC` | Resolve Candidate Against An Existing Restaurant | `V4b` | Alternative outcome |
| `UC-ARO` | [[UC - Own And Claim Restaurants]] | `V10` | Optional step inside this Use Case |
| `UC-GIM` | Generate Initial Menu From Bite Evidence | `V19` | Invoked step |
| `UC-ARB` | Assign Bites To Restaurant | `V23` | Invoked step |
| `UC-MRB` | [[UC - Maintain Restaurants In The Business App]] | After `END-V4` | Downstream |
| `UC-OPS` | [[UC - Operate BiteTribe In The Admin App]] | `V1` | Enclosing: sign-in and the role gate |

Of the referenced Use Cases, **`UC-DIS`, `UC-MRC`, `UC-GIM` and `UC-ARB` do not yet
exist as pages.** They are named here so that each rule this flow depends on has an
owner, and so that writing them is a visible gap rather than an omission.

## Trigger

An Operator decides to verify a listed Candidate. There is no automatic, scheduled or
event-driven trigger — **verification is always a human decision.**

## Preconditions

| # | Precondition | Owner |
|---|---|---|
| P1 | `/restaurantCandidates/{candidateId}` exists with `status == 'pending'` | `UC-DRC` |
| P2 | It carries `name`, `position`, `geohash`, `biteIds`, `evidence` | `UC-DRC` |
| P3 | The acting account holds the `admin` claim and is signed into the Admin App | `UC-OPS` |
| P4 | The client holds a valid App Check token | Platform |

**Not a precondition:** that the evidence Bites still exist — see `V18` — and **not**
that the Candidate is backed by at least five Bites. `UC-DRC` has two producers: the
automatic trigger, which requires five matching nearby Bites, and the Operator's
on-demand clustering callable, which applies no threshold at all. A Candidate can
therefore reach `V4` backed by a single Bite.

## Guarantees

On the successful path, `END-V4`:

| # | Guarantee |
|---|---|
| G1 | Exactly one `/restaurants/{restaurantId}` exists for this Candidate |
| G2 | Exactly one `/menus/{menuId}` exists and is referenced by `restaurant.menuId` |
| G3 | Every evidence Bite that still exists and carried no Restaurant carries `bite.restaurantId == restaurantId`. A Bite that already carried one is untouched and is named in `skippedBiteIds` |
| G4 | The Candidate carries `status == 'verified'`, `verifiedRestaurantId`, `verifiedAt`, `verifiedAtTimestamp`, `verifiedByUserId` |
| G5 | G1 to G4 are atomic. No intermediate state is observable |
| G6 | The decision is attributable to one Operator account |
| G7 | The Restaurant is `unclaimed` unless `V10` was performed |

**Handshake.** `G1` is what `UC-MRB` and `UC-ARO` consume; `G1` and `G2` together are
what the consumer surfaces that render a Restaurant and its Menu consume. Neither
direction of `AF-31` can be closed today: `UC-OPS`, `UC-MRB` and `UC-ARO` are L1 pages
with no numbered preconditions, so no page names the guarantee it depends on. Closing
this is a precondition of this page reaching L3.

`G1` and `G3` hold at `END-V4` and are not durable afterwards. `G1` is falsified by a
second verification of the same Candidate, which `R-18` closes. `G3` is falsified by a
later verification repointing a shared evidence Bite, which `V23` delegates to `UC-ARB`
and which nothing closes today. Both are recorded as `E9` and `E7`.

## Actogram

The flow below is a text actogram; the notation is defined in [[Actogram Format]].

One entry, step-id prefix `V`. `V26`, `V27` and `V28` are retired and are not reused,
and so is the terminal `END-E8`: `V26` was the post-transaction image upload that `V11a`
replaces, and `V27` and `V28` described client-side navigation and a restatement of the
end state, neither of which is a step (`AF-10`).

No step carries an `@` locus. `AF-12` is a `SHOULD` at L2 and a `MUST` at L3; the loci
arrive with the L3 verification pass, together with the provenance line, so that no
anchor on this page is an unverifiable claim.

### Phase 1 - Selecting a Candidate

```
V1   OP   signs into the Admin App
          REF:UC-OPS   the `admin` claim is verified before a session exists, and an
                       account without it receives the generic login failure
          → V2

V2   OP   opens the Restaurant Candidates surface
          └─→ UI   reads DB  /restaurantCandidates  where status == 'pending', in the
                   order of R-17, one page at a time
          └─→ UI   resolves each Candidate's biteIds into Bite evidence, one document
                   read per Bite
          INV:R-1
          INV:R-17
          → V3

V3   UI   renders the Candidate list
          └─◁ OP   sees, per Candidate: the name, the evidence count, up to three dish
                   or place names taken from the evidence Bites, and the position as
                   "latitude, longitude"
          → V4

V4   OP   judges what one Candidate is                                    [decision]
          BASIS: only what V3 renders — no photo, no address, no map, and no indication
                 of whether the Candidate came from the five-Bite trigger or from the
                 Operator's on-demand clustering
          ├─ it is not a real restaurant                          → V4a
          ├─ it is a place that already has a verified Restaurant → V4b
          ├─ it cannot be decided yet                             → END-V3
          └─ it is a real restaurant                              → V5

V4a  OP   dismisses the Candidate                                  [not implemented]
          REF:UC-DIS   must leave the Candidate `dismissed`, and must state what
                       becomes of its evidence Bites
          INV:R-13 is VIOLATED here: no surface and no writer exist, so the Operator
               reaches this decision and cannot execute it
          → END-V1

V4b  OP   resolves the Candidate against the existing Restaurant   [not implemented]
          REF:UC-MRC   must point the Candidate at the already verified Restaurant
                       through verifiedRestaurantId, creating no second Restaurant
          INV:R-14 is VIOLATED here: no surface and no writer exist
          → END-V2
```

### Phase 2 - Reviewing and completing the proposal

```
V5   OP   selects the Candidate
          └─→ UI   seeds a Restaurant draft from it: name, position,
                   restaurantCandidateId, biteIds, bites
          └─◁ OP   sees the new-Restaurant form pre-filled from the Candidate, with the
                   evidence Bites listed beside it
          INV:R-2
          → V6

V6   OP   judges the evidence against the proposal                        [decision]
          BASIS: the evidence Bites rendered in the form — each Bite's dish name, photo,
                 review text and reported price
          ├─ the evidence contradicts the proposal  ↺ V4   the loop is left when the
          │                                                Operator dismisses the
          │                                                Candidate, defers it, or
          │                                                accepts the proposal on a
          │                                                second reading
          └─ the evidence supports the proposal     → V7

V7   OP   requests a Google Places prefill                                [optional]
          └─→ SYS  calls the Places text search with the draft name, biased by the
                   Candidate position
          → V7a

V7a  SYS  queries Google Places
          └─→ EXT  text search
          └─◁ OP   sees a list of matching places, or — where the search fails or
                   matches nothing — an error toast and the form unchanged
          ├─ the search fails or returns nothing → V8
          └─ places are returned                 → V7b

V7b  OP   picks one of the returned places                                [optional]
          └─→ UI   overwrites name, description, street, postcode, city, country
          └─◁ OP   sees those six fields replaced and the position untouched
          INV:R-3
          → V8

V8   OP   completes the mandatory data: name and position
          INV:R-2
          INV:R-4
          INV:R-19
          → V9

V9   OP   completes the optional data — image, description, address, opening hours
          and social media links                                          [optional]
          → V10

V10  OP   assigns a Restaurant Owner                      [optional] [not implemented]
          REF:UC-ARO   must set restaurant.ownerUserId and claimStatus and grant the
                       owner account the `business` role, as one action with the same
                       atomicity as the verification transaction
          INV:R-15 is VIOLATED here: no writer exists, so every Restaurant leaves this
               flow unclaimed and G7's exception is unreachable
          → V11

V11  OP   judges whether the draft is ready to submit                     [decision]
          BASIS: the completed form — the name and position, and whatever optional
                 data was entered, an image included
          ├─ abandons the review  → END-V3
          └─ submits              → V11a

V11a UI   uploads the image and puts its download URL on the draft
                                        [conditional: an image was supplied at V9]
          └─→ SYS  stores the image under the Candidate id and returns its URL
          └─◁ OP   sees an error on the form where the upload fails, with the draft
                   intact and the Candidate untouched
          INV:R-10
          ├─ the upload fails    ↺ V11   the loop is left when the Operator submits
          │                              successfully or abandons the review
          └─ the upload succeeds → V12
```

### Mechanism - Verification, one backend transaction

```
V12  UI   removes the draft-only fields (id, unsaved, restaurantCandidateId, biteIds,
          bites)
          └─→ SYS  calls verifyRestaurantCandidate { candidateId, restaurant }, the
                   image carried as the URL from V11a and never as a base64 payload
          INV:R-5
          INV:R-10
          → V13

V13  SYS  enforces the caller's identity
          INV:R-6
          ├─ no App Check token       → END-E1
          ├─ not authenticated        → END-E2
          ├─ authenticated, no admin  → END-E3
          └─ admin                    → V14

V14  SYS  validates the request
          ├─ candidateId is not a non-empty string → END-E4
          └─ candidateId is a non-empty string     → V15

V15  SYS  reads the Candidate inside the transaction
          INV:R-9
          ├─ it does not exist → END-E5
          └─ it exists         → V16

V16  SYS  checks whether the Candidate is already decided
          INV:R-7
          INV:R-18
          ├─ it carries verifiedRestaurantId, or status != 'pending' → V17
          └─ status == 'pending' and it names no Restaurant          → V18

V17  SYS  resolves an already-decided Candidate
          INV:R-7
          ├─ it carries verifiedRestaurantId → V17a
          └─ it carries none                 → END-E6

V17a SYS  returns the Restaurant the Candidate already points at
          └─◁ OP   sees the verification succeed, naming the Restaurant that already
                   existed and marked as an existing result rather than a created one
          → END-V5

V18  SYS  reads the evidence Bites inside the transaction, before any write
          └─→ SYS  partitions them into those carrying no Restaurant and those
                   already assigned to one
          INV:R-9
          INV:R-16
          INV:R-20
          → V19

V19  SYS  derives the Initial Menu from the Bites it will assign
          REF:UC-GIM   must return Menu categories for a set of Bites, and an empty
                       category list where no Bite has a usable dish name
          INV:R-11
          → V20

V20  SYS  validates the submitted Restaurant data
          INV:R-4
          ├─ name empty, or position not two finite numbers → END-E7
          └─ name and position valid                        → V20a

V20a SYS  builds the Restaurant document
          └─→ SYS  derives geohash from the position
          └─→ SYS  links menuId
          → V21

V21  SYS  creates the Restaurant
          └─→ DB   /restaurants/{restaurantId}
          INV:R-9
          → V22

V22  SYS  creates the Menu
          └─→ DB   /menus/{menuId}, with the categories derived at V19
          INV:R-9
          → V23

V23  SYS  links the unassigned evidence Bites to the Restaurant
          └─→ DB   bite.restaurantId = restaurantId, for every surviving Bite that
                   carries none
          └─→ DB   skippedBiteIds on the Candidate, naming every Bite left untouched
          REF:UC-ARB   must define assigning a Bite to a Restaurant outside this flow;
                       the conflict behaviour inside it is decided by R-20
          INV:R-8
          INV:R-20
          NOTE: today this step is inlined rather than delegated, and it writes
                unconditionally.
          → V24

V24  SYS  marks the Candidate as verified
          └─→ DB   status = 'verified', verifiedRestaurantId, verifiedAt,
                   verifiedAtTimestamp, verifiedByUserId, updatedAt
          INV:R-9
          → V25

V25  SYS  returns { restaurantId, menuId, menuItemCount, candidateId, skippedBiteIds,
                    status: 'created' }
          └─◁ OP   returns to the Candidate list, which no longer lists the Candidate,
                   and the new Restaurant is reachable from the Restaurants surface
          → END-V4
```

### Terminal States

| End | Kind | Aggregate state | Perception | Meaning |
|---|---|---|---|---|
| `END-V1` | Hand-over | `dismissed` | The Candidate no longer appears in the pending list | Left to `UC-DIS`. Unreachable today, `R-13` |
| `END-V2` | Hand-over | `verified` | The Candidate no longer appears in the pending list, and points at the Restaurant that already existed | Left to `UC-MRC`. Unreachable today, `R-14` |
| `END-V3` | Abort | `pending` | Back at the Candidate list with the Candidate still listed; the form draft — the image, address and opening hours entered at `V8` and `V9` — is discarded, because it exists only in the client form | Deferred or abandoned. No side effect |
| `END-V4` | Success | `verified` | The Candidate list no longer lists it, and the new Restaurant is reachable from the Restaurants surface | G1 to G7 hold |
| `END-V5` | Idempotent success | `verified` | The verification succeeds, naming the Restaurant that already existed, and marked as an existing result rather than a created one | Nothing is created |
| `END-E1` | Rejection | `pending` | The submission fails with a generic error and the form keeps its data | App Check token missing or invalid |
| `END-E2` | Rejection | `pending` | The submission fails and the Operator is asked to sign in | `unauthenticated` |
| `END-E3` | Rejection | `pending` | The submission fails, and signing in again does not help | `permission-denied`, the account holds no `admin` claim |
| `END-E4` | Rejection | `pending` | The submission fails with a generic error | `invalid-argument`, `candidateId` |
| `END-E5` | Rejection | `absent` | The submission fails, and the Candidate is gone from the list on reload | `not-found` |
| `END-E6` | Rejection | `dismissed` | The submission fails with a generic error | `failed-precondition`: decided, but pointing at no Restaurant |
| `END-E7` | Rejection | `pending` | The submission fails and the form keeps its data | `invalid-argument`, name or position |

## Rules And Invariants

| ID | Normative statement |
|---|---|
| **R-1** | The list shows only `status == 'pending'`. A Candidate that has left `pending` is out of this Use Case's reach by any path other than `V17`. |
| **R-2** | The Candidate seeds the Restaurant's `position` at `V5` and is ground truth for it. Nothing automatic may replace it — no prefill, no geocode, no default. The one permitted override is an Operator correction at `V8`, under `R-19`. |
| **R-3** | The Google Places prefill never touches `position`. It overwrites exactly `name`, `description`, `street`, `postcode`, `city`, `country`. `position` is excluded because `R-2` makes it evidence rather than metadata, not as an implementation accident. |
| **R-4** | `name` and `position` are the only mandatory Restaurant data, and are validated twice: in the form at `V8`, and again at `V20`. The backend never trusts the client's validation. The image is optional and is not a backend invariant, so a Restaurant may be published without one. |
| **R-5** | The Candidate-based save path is **not** the ordinary create-restaurant path. A client saving through the ordinary store path bypasses the whole verification transaction. |
| **R-6** | Authorization is enforced in the backend on the verified ID token. The route guard is a convenience, not the gate. |
| **R-7** | Verification is idempotent. A second call for the same Candidate creates nothing and returns the existing Restaurant, marked as an existing result and not as a created one, so a caller can tell `END-V5` from `END-V4`. |
| **R-19** | *Intended, not met.* An Operator correction of `position` at `V8` is recorded as a correction, so a corrected position is distinguishable from the seeded one. Nothing marks the difference today, so a later write cannot know it must not revert the correction, and the Restaurant's geohash derived at `V20a` can diverge from the Candidate's own `geohash` with nothing to say which is right. |
| **R-18** | *Intended, not met.* Idempotency is keyed on `verifiedRestaurantId`, not on `status`. A Candidate that names a Restaurant has already been verified whatever its status says: `status` is a label any writer can rewrite, the field is the fact. Today `V16` branches on `status` alone, so a Candidate returned to `pending` while still naming a Restaurant is verified a second time. |
| **R-8** | `bite.restaurantId` has **four** writers. `V23` is the only transactional one, and the only one inside this Use Case. Two more sit in the Bite form, which carries a `restaurantId` control set when a Bite Creator picks a verified nearby Restaurant: the whole form value is persisted on create **and on edit**. The fourth is the Admin App's Candidate-free save path, which links every listed Bite in a client-side write outside any transaction; it is unreachable today only because the Bite-places surface passes no `biteIds`. Detection is deliberately **not** a writer — see `UC-DRC` `R-6`. |
| **R-9** | `V15` to `V24` are one transaction. The Candidate read at `V15` and the evidence read at `V18` happen inside it, before any write, so no observable state has a Restaurant without its Menu, or Bites pointing at a Restaurant whose Candidate is still `pending`. |
| **R-10** | *Intended, not met.* Everything the Restaurant needs in order to be valid is written inside `R-9`'s transaction. An image is therefore uploaded at `V11a`, before the callable, so only its URL crosses the boundary. Today the image is instead written after the transaction has committed, by a direct client write to `/restaurants` that works only because of \#1078's open rules. Owned by \#1504. |
| **R-11** | The Initial Menu is a **draft derived from evidence**, not a statement about the real menu. Its prices are averages of what Bite Creators reported. |
| **R-12** | A Bite Creator is never notified and sees no state change from this Use Case, other than their Bite now appearing under a Restaurant. |
| **R-13** | *Intended, not met.* A Candidate the Operator judges not to be a restaurant is left `dismissed` (`V4a`, `UC-DIS`). No surface and no writer exist, so `dismissed` is a declared status that nothing can reach. |
| **R-14** | *Intended, not met.* A Candidate for a place that already has a verified Restaurant is resolved against that Restaurant (`V4b`, `UC-MRC`), creating no second Restaurant. No writer exists. |
| **R-15** | *Intended, not met.* Owner assignment at `V10` sets `restaurant.ownerUserId` and `claimStatus` and grants the `business` role, as one action with the atomicity of `R-9`. No writer exists, so every Restaurant leaves this flow unclaimed. |
| **R-16** | An evidence Bite deleted after detection is skipped at `V18`, rather than failing the transaction and stranding the Candidate in `pending`. |
| **R-20** | *Intended, not met.* A surviving evidence Bite that already carries a non-empty `restaurantId` — of any shape, bare id or document path — is skipped: it is not written at `V23`, it is named in the Candidate's `skippedBiteIds` and in the callable's result, and it is excluded from the Menu derivation at `V19`, because a Menu must not be derived from a dish belonging to another Restaurant. The transaction still completes and the Candidate still reaches `verified` even where every listed Bite was skipped. Owned by \#1498. |
| **R-17** | *Intended, not met.* The Candidate list has one server-side order and no selectable ordering — `evidence.biteCount` descending, then `createdAtTimestamp` descending — and it pages rather than truncating, so every `pending` Candidate is reachable. Ordering without paging satisfies neither half. |

## Exceptions And Failure Modes

| # | Situation | Behaviour | Assessment |
|---|---|---|---|
| E5 | The model deletes `merged`, and the code still carries the status and the `mergedIntoCandidateId` branch at `V17` | The branch exists in code and is unreachable in practice, because nothing writes the status | Gap, \#1499 |
| E7 | An evidence Bite already belongs to another Restaurant | Silently overwritten at `V23` today, and reachable by a Bite Creator editing their own Bite, per `R-8`. Detection excludes assigned Bites, so a Candidate's `biteIds` were all unassigned at clustering time: the divergence appears between clustering and verification, in a window nobody watches. `R-20` decides the behaviour and is not built | Defect, \#1498 |
| E8 | More than five Candidates are `pending` | `V2` takes the first five in document-id order and does not page, so every Candidate beyond the fifth is unreachable by any path. Ordering alone would change which five are stuck, not that five are stuck — which is why `R-17` requires paging as well | Defect, \#1506 and \#1507 |
| E9 | A verified Candidate is returned to `pending` — by detection's unconditional write, by an Operator, or through the open data layer — while it still carries `verifiedRestaurantId` | `V16` branches on `status` alone, so the Candidate reaches `V18` and a second Restaurant is created for a business that already has one. `R-18` closes it and is not built. The reset itself is owned by `UC-DRC` `R-8` | Defect, \#1521 |
| E10 | The Operator corrects `name` or `position` at `V8` | Detection's only protection against re-detecting an already verified place is a 0.82 name score within 200 m, so a correction past either threshold defeats it: the Candidate is reset to `pending` with a stale `verifiedRestaurantId`, which is the state `E9` then acts on. Nothing records that the value was corrected (`R-19`), and the Restaurant's geohash from `V20a` no longer matches the Candidate's. Strengthening that check is explicitly out of scope in \#1497 | Defect, \#1522 |
| E11 | The image upload runs after the verification transaction has committed | The Restaurant is created without it; the failure surfaces as an unhandled rejection on the form, and a resubmit returns the idempotent result so the upload is never retried. The write is a direct client write to `/restaurants`, depending on \#1078's open rules. `V11a` and `R-10` close it | Defect, \#1504 |

`E1`, `E2`, `E3`, `E4` and `E6` were removed under `UF-12`: each restated a branch the
actogram already carries. Their ids are retired and are not reused.

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
Candidate to `verified`, without ever calling the callable. The guard protects the *flow*, not the *data*. Owned by \#1078.

## MVP Classification

**[MVP]** — the success path `V1` to `V3`, the "it is a real restaurant" branch of
`V4`, `V5`, `V6`, `V8`, `V11` to `V25`, and the terminal states `END-V3`, `END-V4`,
`END-V5`, and `END-E1` to `END-E7`.

**[MVP] and not implemented — release blockers under `UF-15`:**

- `V2`'s ordered, paged Candidate list (`R-17`, `E8`, \#1506 and \#1507). The surface reads the first five
  `pending` Candidates in document-id order and does not page, so everything beyond the
  fifth is unreachable. With dismissal deferred below, this is the only thing keeping
  the queue workable.
- `V16`'s guard on `verifiedRestaurantId` (`R-18`, `E9`, \#1521). Without it a
  Candidate returned to `pending` is verified a second time, publishing a duplicate page
  about a real, named business. The reset path is live today because `UC-DRC` `R-8`'s
  guard is not built either.

**[Secondary]**

- `V4a` and `END-V1` — dismissal (`R-13`, `UC-DIS`). Deliberately out of the release:
  dismissal is inert without `UC-DRC` `R-8`'s guard, because detection's unconditional
  write returns a dismissed Candidate to `pending`. The release fix for the queue is the
  cap at `V2`, not dismissal — see `E8`.
- `V7`, `V7a`, `V7b` — the Google Places prefill. A convenience: `V8` covers the same
  fields by hand.
- `V9` — the optional Restaurant data.
- `V10`, and `G7`'s exception — owner assignment (`R-15`, `UC-ARO`, \#1069).
- `V4b` and `END-V2` — duplicate resolution (`R-14`, `UC-MRC`). A duplicate Restaurant
  is a data-quality defect, not a blocked flow: the Operator can defer at `END-V3`.
- `R-19`'s recording of a corrected `position` (`E10`). The correction itself works at
  `V8`; only the marker that distinguishes it from the seeded value is missing, and a
  silent revert needs the same reset path `R-18` closes.

`V11a` is `[MVP]` where an image was supplied: storing it is not optional once the
Operator has provided it. `R-10` is `[MVP]` and not built — the upload runs after the
transaction today (`E11`) — but it has an owner in \#1504, so it is not a blocker
without an issue.

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
3. **A published Restaurant may have no image,** per `R-4`. The consumer app must render
   a page for a real, named business with no photograph of it, which is the same
   presentation question as point 2 one notch weaker. Recorded here because `V9` is
   where the image becomes optional.

Neither blocks the current release candidate. Both are recorded here so they are not
discovered in review.

## Related GitHub Scope

- Part of epic \#1495, the verification work in flight.
- \#1472 — `admin`-gates the callable. The enforcement behind `V13` and `R-6`.
- \#1473 — moves the Operator surface into `bite-tribe-admin`. `V2`, `V3`, `V5`.
- \#1078 — `firestore.rules` grants every authenticated user every write. The
  "Not enforced" half of `Authorization`, and what the post-transaction image write
  depends on today (`R-10`, `E11`).
- \#1069 — owner assignment. `V10`, `R-15`, `UC-ARO`.
- \#1506 and \#1507 — the ordered, paged Candidate list. `V2`, `R-17`, `E8`. MVP
  release blocker.
- \#1521 — `V16`'s guard on `verifiedRestaurantId`. `R-18`, `E9`. MVP release blocker.
- \#1522 — detection recognising a verified place after its name or position was
  corrected. `R-19`, `E10`.
- \#1498 — a Bite that already belongs to a Restaurant is skipped, not reassigned.
  `V18`, `V19`, `V23`, `R-20`, `E7`.
- \#1499 — removing the `merged` status and its resolution branch. `V17`, `E5`.
- \#1504 — the image upload moves in front of the transaction. `V11a`, `R-10`, `E11`.
- \#1497 — detection's guard against writing `pending` onto a decided Candidate. It
  owns the reset half of `E9`; this page owns the duplicate that follows.
- **No issue yet:** dismissal (`V4a`, `R-13`, `UC-DIS`) and duplicate resolution
  (`V4b`, `R-14`, `UC-MRC`), both `[Secondary]` and both deferred deliberately.

## Related Domains

- [[Restaurant]]
- [[Bite]]
- [[User]]

## Related Pages

- [[Recorded Decisions]]

- [[Actogram Format]]
- [[Use Case Format]]
- [[UC - Detect Restaurant Candidate]]
- [[UC - Operate BiteTribe In The Admin App]]
- [[UC - Own And Claim Restaurants]]
- [[UC - Maintain Restaurants In The Business App]]
- [[Implementation - Firebase Functions]]
