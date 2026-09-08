# Recorded Decisions

## Purpose

Every recorded decision in the graph, in one register, so that a decision id can be
resolved without grepping. Per `UF-6` in [[Use Case Format]] a page links the decisions
that bind it rather than embedding them.

## How an id is formed

A decision is cited as **`RD-<REGISTER>-<n>`**.

- **The register prefix is part of the id.** `RD-UR-6` and `RD-VRC-6` are different
  decisions. A bare `RD-6` resolves to nothing and must not be written.
- **The register names the subject the decision binds**, not the page that stores it -
  every decision below is stored here.
- **Numbers are historical.** They need not be contiguous within a register, and a
  number is not reused after its decision is removed.

| Register | Subject | Binds |
|---|---|---|
| `RD-UR-*` | Roles, the capability matrix, and their relationship to the personas | [[User Roles]] |
| `RD-VRC-*` | Restaurant-candidate verification | [[UC - Verify Restaurant Candidate]] |
| `RD-DRC-*` | Restaurant-candidate detection | [[UC - Detect Restaurant Candidate]] |

Decisions about **how the specification work is written and tracked** are not system
decisions and are deliberately not here: they are `RD-PD-*`, in
`claude/process-decisions.md` in the project docs.

## `RD-UR-*` - Roles

Taken 7 September 2026 unless stated otherwise.

| # | Decision |
|---|---|
| `RD-UR-1` | Roles and personas stay separate vocabularies, cross-referenced. Roles live here; personas stay in [[Personas]] |
| `RD-UR-2` | "Business User" is retired. Every occurrence resolves to Operator or Restaurant Owner |
| `RD-UR-3` | The Operator role name aligns with the existing "BiteTribe operator" wording rather than introducing "Admin" as a domain term |
| `RD-UR-4` | **The BiteTrail Creator role is retired and the `curator` claim is not introduced.** Publishing a BiteTrail becomes a Bite Creator capability in the consumer app, and the eventual paid gate is payout onboarding rather than a claim. Implementation: issue \#1519. Correcting epic \#1125, which places the creator flow in the Business App through \#1154 and \#1157, is out of that issue's scope and owned by nothing |
| `RD-UR-5` | **Curator onboarding for the initial release needs no implementation.** An Operator grants `business` to a BiteTribe-held account, which curates the launch BiteTrails. Acceptable only for accounts BiteTribe controls, because the Business App also hands them every Restaurant-maintenance surface. Closed by decision rather than by work |
| `RD-UR-6` | **The Operator is above the Restaurant Owner in capability: it may maintain every Restaurant, claimed or unclaimed, without owning any.** Delivered through an Admin App restaurant-edit surface plus an `admin` allowance in the ownership-scoped Firestore rules - **not** by granting the `business` claim, and never by writing `Restaurant.ownerUserId`. `admin` still does not imply `business`. Maintenance of a Restaurant the Operator does not own follows epic \#1471's operator log shape: actor, target, outcome. This closes the hierarchy question rather than deferring it |
| `RD-UR-7` | **The user-generated-content safeguard set is `[MVP]`, and it is exactly four things:** a report action on Bites, Reviews and user profiles; user-to-user blocking; a reachable contact address for content complaints (\#1429); and a written response-time expectation. "Filtering" is satisfied by human review of reports, **not** by automated or model-assisted classification, which stays out of scope as epic \#1284 already has it. The Operator-side actions \#1474 and \#1475 are a separate half and do not substitute for the user-facing one. Recorded 8 September 2026 |

## `RD-VRC-*` - Restaurant candidate verification

Taken 7 September 2026.

| # | Decision |
|---|---|
| `RD-VRC-6` | **Scope.** `V19` and `V23` stay inside the verification transaction but are *referenced* steps, owned by `UC-GIM` and `UC-ARB`. This Use Case covers verification only; dismissal and duplicate resolution are referenced Use Cases with their own terminal states. Owner assignment is an optional step at `V10`, referencing `UC-ARO` |
| `RD-VRC-7` | **`merged` is removed.** `merged` and `mergedIntoCandidateId` go from both model copies, and `V17`'s merge branch with them. A duplicate Candidate is resolved against an **already verified Restaurant**, which needs no status of its own. Real merging already happens by document-id convergence, which unions `biteIds` without any status, event or audit trail |
| `RD-VRC-8` | **`UC-DRC` owns every producer.** Both the automatic trigger and the Operator's on-demand clustering callable belong to detection, so the threshold divergence is stated once, next to the threshold |
| `RD-VRC-9` | **Refused evidence is not rerouted.** When a write onto a non-`pending` Candidate is refused, the refusal is logged and no Bite is written. Those Bites carry no `restaurantId` and therefore stay visible on the Admin App's Bite-places surface. Detection does not become a writer of `bite.restaurantId` |
| `RD-VRC-10` | **The on-demand producer keeps no evidence threshold.** A deliberate Operator action is the safeguard. The collection's invariant is restated instead: every Candidate is either backed by at least five matching Bites within 200 m, **or** marked as Operator-created |
| `RD-VRC-11` | **The derived-menu marker never clears automatically.** Retraction is an explicit confirmation by the Restaurant Owner. Because `ownerUserId` has no writer, that action is sequenced behind owner assignment (`UC-ARO`, \#1069) rather than shipped alongside the marker — so the marker is never a declared state without a writer, which is the mistake `RD-VRC-7` removes |
| `RD-VRC-16` | **The Candidate list has one server-side order and no selectable ordering:** `evidence.biteCount` descending, then `createdAtTimestamp` descending. The consumer app's client-side sort criterion reorders an already-fetched array, which cannot affect *which* Candidates a limited query returns — and that is this list's actual defect. A work queue for two Operators also has one defensible default, unlike a discovery feed where preference genuinely varies. Recorded so the divergence from the consumer convention reads as deliberate |

## `RD-DRC-*` - Restaurant candidate detection

Taken 7 September 2026.

| # | Decision |
|---|---|
| `RD-DRC-18` | **Detection is one Use Case with two entries and one shared kernel,** not two Use Cases. Entry A has no human actor and Entry B is Operator work, which is the argument for splitting; the argument that wins is that both execute the same clustering code, so `R-1`, `R-5`, `R-7`, `R-8`, `R-9` and `R-10` would have to be stated twice and kept in agreement by hand. `K5` is the only step whose behaviour differs by entry, which makes `RD-VRC-10` one gated step instead of a fact duplicated across two pages |
| `RD-DRC-19` | **Automatic detection is a mechanism, not an entry.** It has no actor: it runs in the Functions runtime, is callable from no client, and no human is in the loop. `AF-4` reserves the word *actogram* for a flow containing at least one interaction step, and names a flow without one a mechanism. The page therefore has one entry - the Operator's - and two mechanisms that converge on the shared kernel. This revises the framing of `RD-DRC-18` rather than reversing it: detection remains one Use Case owning both producers, for the reason `RD-DRC-18` gives. `AF-4` also says such a mechanism is written inside the Use Case whose actor causes it, which would place it in `UC-CMB`; it stays here because both producers execute the same clustering code, which is `RD-DRC-18`'s argument. Recorded 8 September 2026 |

## Provenance

Created 8 September 2026, when the register was centralised.

`RD-UR-*` and `RD-DRC-18` were moved verbatim from [[User Roles]] and
[[UC - Detect Restaurant Candidate]].

**The seven `RD-VRC-*` entries were restored, not moved.** They were deleted from
[[UC - Verify Restaurant Candidate]] when that page was migrated to the actogram format
earlier the same day, before this register existed, and no copy remained in the working
tree or in `logseq/bak/`. The text above was recovered from a working transcript and is
believed verbatim, but it has **not** been checked against a copy in the graph, because
none exists. Confirm `RD-VRC-6` to `RD-VRC-16` against the code and the issues before
treating them as verified.

## Related Pages

- [[Use Case Format]]
- [[User Roles]]
- [[UC - Verify Restaurant Candidate]]
- [[UC - Detect Restaurant Candidate]]
- [[SSOT]]
