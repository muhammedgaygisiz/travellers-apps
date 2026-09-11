# Use Case Format

Sibling of [[GitHub Issue Format]]. The flow notation lives in [[Actogram Format]];
this page defines the page that contains it.

## Purpose

This page defines how a `UC - *` page is written in this graph: which sections it has,
what each one may and may not contain, how its identifiers work, and how an existing
page is migrated to the format.

It exists because the format was invented inside two pages —
[[UC - Detect Restaurant Candidate]] and [[UC - Verify Restaurant Candidate]] — and is
currently knowable only by imitation. Each of those pages carries its own copy of the
notation legend, so with 36 use-case pages the legend would exist 36 times and could
disagree with itself in 36 ways.

Rules are numbered `UF-n` and are citable. `MUST` rules are conformance conditions.

[[GitHub Issue Format]] currently states that use cases are excluded from it because a
`UC - *` page "keeps its own shape: `Status`, `Goal`, `Actors`, `Related Domains`, and a
current or target flow". That sentence becomes a pointer to this page.

## Scope

This page governs `UC - *` pages, and only those. `epic-*`, `issue-*`, `ADR-*`,
`Architecture - *`, `Implementation - *` and domain pages keep their own shapes.

A use-case page is a statement about **behaviour**. It is not a design document, not a
defect list and not a work plan. Where it needs one of those, it links to it.

## Maturity Levels

- **UF-1** Every use-case page MUST declare a level in the first line of `## Status`,
  as `**Level:** L0` / `L1` / `L2` / `L3`.

| Level  | Name              | What it asserts                                                                                                                 | Flow written as                                         |
| ------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| **L0** | Idea              | A behaviour worth naming has been proposed. No claim that the team agrees on it, that it is scoped, or that any flow is settled | Optional prose bullets under `Flow` — or no flow at all |
| **L1** | Narrative         | The behaviour as the team understands it. No claim of completeness                                                              | Prose bullets under `Flow`, where written               |
| **L2** | Actogram          | Every path, including every failure path, is enumerated and ends in a named terminal state. No claim about the code             | Actogram, as-agreed                                     |
| **L3** | Verified actogram | L2, and the flow was read against a named commit on a named date, with code anchors and a locus per step                        | Actogram, as-built                                      |

- **UF-2** A use case that is not implemented MUST NOT be L3, and SHOULD stay at L0 or L1
  until it is built. Forcing an actogram onto unbuilt behaviour invents branches no code
  has had.
- **UF-3** L0 and L1 are legitimate resting levels. A page is migrated because a decision
  needs it, not to reach uniformity.

## Page Shape

- **UF-4** Section titles MUST be used verbatim, as `##` headings, in this order.
  `–` means the section is not used at that level; `opt` means the section may be
  included or left out entirely, and carries no minimum content when it is included.

| #   | Section                        | L0  | L1  | L2  | L3  | Content                                                                                                                                                                                                               |
| --- | ------------------------------ | --- | --- | --- | --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `Status`                       | ✓   | ✓   | ✓   | ✓   | Level; at L3 the provenance line; one paragraph of snapshot; optionally an aspect/state table. A snapshot only — never the only place a fact lives                                                                    |
| 2   | `Goal`                         | ✓   | ✓   | ✓   | ✓   | What becomes true for whom, and what this page therefore owns. Two paragraphs at most                                                                                                                                 |
| 3   | `Actors`                       | ✓   | ✓   | ✓   | ✓   | Roles from [[User Roles]] only. For each: whether it acts, and if not, why it is named at all. At L0 this may be a provisional guess                                                                                  |
| 4   | `Lanes`                        | –   | –   | ✓   | ✓   | Code, kind and binding per lane. `AF-2`                                                                                                                                                                               |
| 5   | `Aggregate`                    | –   | –   | ✓   | ✓   | The object the flow acts on, its collections, and the states it can be left in. `AF-1`                                                                                                                                |
| 6   | `Scope`                        | –   | –   | ✓   | ✓   | In scope in prose; the completeness claim (`AF-32`); out of scope as the referenced-use-case table                                                                                                                    |
| 7   | `Trigger`                      | –   | –   | ✓   | ✓   | What starts the flow. States explicitly whether any automatic trigger exists                                                                                                                                          |
| 8   | `Preconditions`                | –   | –   | ✓   | ✓   | `P1..Pn`, each with an owner: another use case, or `Platform`                                                                                                                                                         |
| 9   | `Guarantees`                   | opt | opt | ✓   | ✓   | `G1..Gn`, true at the success terminal state and nowhere else. At L0 and L1, where no terminal state exists yet, they state what is true once the behaviour has succeeded and are re-anchored onto the terminal at L2 |
| 10  | `Flow`                         | opt | opt | –   | –   | The behaviour as prose bullets, per `UF-4a`. At L2 and L3 the `Actogram` holds it instead                                                                                                                             |
| 11  | `Actogram`                     | opt | opt | ✓   | ✓   | Per [[Actogram Format]]. Phases, mechanism sections, terminal table. At L0/L1, when present, may be a partial sketch rather than a complete enumeration — `UF-2`                                                      |
| 12  | `Rules And Invariants`         | opt | opt | ✓   | ✓   | `R-1..R-n`. Normative statements. Code-anchor column at L3 only                                                                                                                                                       |
| 13  | `Exceptions And Failure Modes` | –   | –   | opt | ✓   | Only what the actogram cannot express. See `UF-12`                                                                                                                                                                    |
| 14  | `Authorization`                | –   | –   | ✓   | ✓   | What is enforced, where, and what is not                                                                                                                                                                              |
| 15  | `MVP Classification`           | ✓   | ✓   | ✓   | ✓   | Never omitted. `[MVP]`, `[Secondary]` or `[Obsolete]`. See below                                                                                                                                                      |
| 16  | `App Store Review Area`        | opt | ✓   | ✓   | ✓   | Never omitted from L1 up. Same rule as [[GitHub Issue Format]]: if not relevant, "not relevant, because …"                                                                                                            |
| 17  | `Supported Evidence`           | opt | ✓   | –   | –   | Optional at L0, required at L1. At L2 and L3 the `@` locus on each step replaces it                                                                                                                                   |
| 18  | `Related GitHub Scope`         | opt | ✓   | ✓   | ✓   | Never omitted from L1 up. The issue and epic links that close the chain in [[Agent Operating Contract]]                                                                                                               |
| 19  | `Related Domains`              | ✓   | ✓   | ✓   | ✓   | Domain pages only                                                                                                                                                                                                     |
| 20  | `Related Pages`                | opt | opt | ✓   | ✓   | Everything that is not a domain page                                                                                                                                                                                  |

- **UF-4a** `Flow` holds the behaviour as prose bullets. Where what is built and what is
  intended differ, the bullets say which is which; the build state is `Status`'s fact and
  is not carried by the section title (`UF-7`). The section is gone at L2 because the
  actogram enumerates it, not because the prose was discarded - a flow that cannot yet be
  enumerated keeps its bullets and the page rests below L2 (`UF-2`, `UF-3`).

- **UF-4b** A section the table does not name MAY remain below L2, placed after `Flow`,
  and MUST NOT be deleted to reach a level. It is resolved on the way to L2 into whatever
  owns it: `Key Behaviours` and `Boundary Conditions` are normative and become
  `Rules And Invariants`; `Success Criteria` is an epic section that splits into
  `Guarantees` and the owning issue's acceptance criteria ([[GitHub Issue Format]]);
  rationale moves to the issue or the ADR; a fact another page owns becomes a link to it
  (`UF-7`).

- **UF-5** A page MUST NOT carry a `Notation` section. It writes one line instead:
  `The flow below is a text actogram; the notation is defined in [[Actogram Format]].`
  A page with several entries MAY add one paragraph declaring its step-id prefixes.
- **UF-6** A page MUST NOT carry a `Recorded Decisions` section. A register split
  across pages cannot be read as a register. Decisions live on one page,
  [[Recorded Decisions]]; the use case links the ones that bind it. Ids carry their
  register as a prefix - `RD-VRC-7`, never a bare `RD-7`.
- **UF-7** A page MUST NOT state the same fact in two sections. Every fact has one home
  and the others point at it.
- **UF-8** A page appears in `Related Domains` or in `Related Pages`, never both.

## Identifiers

| Family           | Form              | Scope    | Renumber |
| ---------------- | ----------------- | -------- | -------- |
| Step             | `V1`, `A3`, `K10` | page     | never    |
| Terminal state   | `END-V4`          | page     | never    |
| Precondition     | `P1`              | page     | never    |
| Guarantee        | `G1`              | page     | never    |
| Rule / invariant | `R-1`             | page     | never    |
| Exception        | `E1`              | page     | never    |
| Use-case code    | `UC-VRC`          | graph    | never    |
| Decision         | `RD-VRC-7`        | register | never    |
| GitHub issue     | `#1472`           | GitHub   | –        |

- **UF-9** A cross-page reference MUST be written `` `UC-DRC` `R-6` `` — the use-case
  code, then the local id. A bare `R-6` always means this page's `R-6`.
- **UF-10** A `UC-ID` MUST be claimed in the registry at the end of this page before it
  is used in a `Scope` table.
- **UF-10a** The registry's `Page` cell MUST hold either a `[[page]]` link or exactly
  `none`. A code whose behaviour is documented on a page links that page, whatever the
  page is named. A code MUST NOT be claimed for behaviour that an existing page
  already owns — that page's own code is the reference target (`UF-9`).
- **UF-11** In Logseq, an issue number that opens a line or follows a space is escaped
  as `\#1472`; inside a table cell or after a word, plain `#1472`. Prefer
  `[[issue-1472]]` where a mirror page exists.

## Exceptions And Failure Modes

- **UF-12** The table MUST hold only what the actogram cannot express: an interaction
  between steps that no single step owns; a data shape that makes a branch reachable in
  a way its condition does not reveal; a scale or timing condition; a case in another use
  case seen from this one. A row restating a branch already in the actogram MUST be
  removed.
- **UF-13** The `Assessment` column MUST carry one word — `Correct`, `Defect`, `Gap` —
  plus the issue that owns it. The argument belongs in that issue and in
  [[Current State - Known Issues]]: an assessment has an author and a date, a use case
  does not.

## MVP Classification

MVP is the core functionality strictly required for the initial release; everything else
is secondary. See [[GitHub Issue Format]] for the `P0`–`P4` board mapping.

- **UF-14** The section MUST classify the page and, where the page is not uniform, name
  the exceptions by step id and terminal id:

```
**[MVP]** — the success path V1 to V25 and the terminal states END-V3 to END-V5.
**[Secondary]** — V7 to V7b the Places prefill, V4a and END-V1 dismissal (UC-DIS).
```

- **UF-15** A step or terminal state that is `[Secondary]` and unimplemented needs no
  defect entry. One that is `[MVP]` and unimplemented is a release blocker and MUST
  carry an issue. Nothing on an `[Obsolete]` page is a release blocker (`UF-21`).

Where the behaviour the page describes has left scope, the section carries the single
`[Obsolete]` line instead. See Obsolete Pages.

## Provenance

- **UF-16** Only an L3 page carries this line, immediately under the level in `Status`:

```
**Verified against the code on <date>**, branch `<branch>` at `<short sha>`, read-only.
```

- **UF-17** The branch and sha MUST be the checkout actually read. Two pages read in one
  sitting carry the same branch and sha; if they do not, one of them is wrong.
- **UF-18** Editing an L3 page's actogram MUST either re-verify it and update the line,
  or drop the line and the page to L2. A stale provenance line is worse than none.
- **UF-19** The line MUST NOT claim more than was read. Where code was read but runtime
  behaviour was not observed, the page says so.

## What Does Not Belong On A Use Case Page

- The notation legend (`UF-5`).
- An `RD-*` entry (`UF-6`).
- The argument for why something is a defect (`UF-13`).
- A code anchor as a normative statement. Anchors are informative and decay fastest of
  anything on the page; the rule must stand without them.
- A step with no domain effect, decision, boundary crossing or perception (`AF-10`).
- A fact stated twice (`UF-7`).

## Migrating An Existing Page

### L0 → L1

1. **Settle the actors.** Replace any placeholder or provisional names in `Actors` with
   the real roles from [[User Roles]], and state for each whether it acts.
2. **Check the idea is actually agreed**, not just proposed. If nothing beyond the idea
   is settled, the page stays at L0 — do not add prose bullets just to move the number.
   `Flow` already exists at L0 (`UF-4a`); what changes here is that the team now shares
   the understanding its bullets state, not that the section appears.
3. **Add what L1 requires and L0 left optional:** `App Store Review Area`,
   `Supported Evidence` and `Related GitHub Scope` all become required (`UF-4`);
   `Related Pages` stays optional.
4. **Do not add an Actogram** unless the page is ready to enumerate every path — that is
   what makes it L2, not this migration.

### L1 → L2

1. **Name the aggregate** and the states it can be left in (`AF-1`).
2. **Map the informal actors** ("Food lover", "Traveler") onto the lane vocabulary in
   [[Actogram Format]]. Most consumer pages are `BC`, `UI`, `SYS`, `DB`, plus `NAT`
   wherever a permission, camera, gallery or store client appears.
3. **Split the prose bullets into actor turns first.** The legacy `Flow` bullets
   mix actor actions, system behaviour and policy in one list. Extract only the actor
   actions, in order; they become the interaction steps.
4. **Turn every "should", "never" and "always" into a rule `R-n`,** not a step. This is
   where most of a legacy page's content actually moves — the bullets are largely policy.
5. **Write the mechanism runs** each interaction triggers (`AF-21`).
6. **Enumerate the exits.** Every failure the prose mentions — "gives up after fifteen
   seconds", "raises its own error" — becomes a terminal state with a kind and a
   perception. This is where the format earns its keep, because it is where the missing
   branches surface.
7. **Move `Supported Evidence` onto the steps** as `@` loci, then delete the section.
8. **Write `Guarantees` last**, from the success terminal - or re-anchor onto it the
   ones the page already carries from L0 or L1 - and check the handshake against every
   referenced use case (`AF-31`, and `AF-34` for those that answer back).
9. **Do not add code anchors** unless the page reaches L3 in the same sitting. An anchor
   without a provenance line is an unverifiable claim.
10. **Run the checklist** in [[Actogram Format]] and report failures by rule id.

### L2 → L3

Add the provenance line, a locus per step (`AF-12`), the code-anchor column, and the
`Exceptions And Failure Modes` table. Nothing else changes; if the actogram changes, it
was not L2-correct.

### Order

- **UF-20** Migration order MUST follow release risk, not the page list. A page is
  migrated when a decision depends on it, when it is referenced by an L2 or L3 page and
  must hold up its end of a contract, or when Apple or Google exercise it directly.

## Obsolete Pages

A use case becomes obsolete when the behaviour it describes leaves scope. The page is
deleted once the code is gone; the marker is what keeps that deletion on a list rather
than in someone's memory.

- **UF-21** An obsolete page is classified `**[Obsolete]**` in `MVP Classification`. The
  classification applies to the whole page and MUST be the only one on it: never mixed
  with `[MVP]` or `[Secondary]` lines, and never applied to a single step or terminal state.
- **UF-22** The line MUST name the issue that removes the code, or state `no issue yet`.

```
**[Obsolete]** — the business app let a restaurant run backfills on its own data, a
workaround for the missing `admin` role. Removed by \#1473.
```

- **UF-23** An `[Obsolete]` page is deleted once the code it describes is gone. Before it
  goes: no other page may reference its `UC-ID` — a reference in another page's `Scope`
  table is a contract, and it is removed or re-pointed first (`UF-9`); and the entry is
  removed from [[SSOT]], [[contents]], from [[Traceability Map]] where it appears, and
  from the registry at the end of this page.

## Template

A new use-case page starts from this skeleton. It is kept here rather than as a
`UC - Template` page so that it does not appear in the use-case lists in [[SSOT]] and
[[contents]].

Inside the skeleton the actogram blocks are fenced with `~~~` so that they nest inside
the skeleton's own block. Replace them with ordinary backtick fences when you copy it out.

### L0 Skeleton

An L0 page needs only the sections `UF-4` requires at that level; everything else in
the full skeleton below is legitimately absent until the page earns it.

```markdown
# UC - <Verb Phrase Naming The Outcome>

## Status

**Level:** L0.
<the idea, and what would have to be true for it to become a narrative>

## Goal

<what becomes true, for whom, if this is ever built>

## Actors

- **<Role>** — <provisional guess at its part, or why it is named anyway>.

## MVP Classification

**[MVP]** or **[Secondary]** — <best guess; revisit once the page reaches L1>

## Related Domains

- [[<Domain>]]
```

`Flow` (`UF-4a`), `Guarantees`, `App Store Review Area`, `Supported Evidence`,
`Related GitHub Scope`, `Related Pages` and `Actogram` may all be added at L0 (`UF-4`)
but none is required to bring the page into existence.

### Full Skeleton

Used from L1 upward; trim the sections a lower level does not require.

```markdown
# UC - <Verb Phrase Naming The Outcome>

## Status

**Level:** L2.
<what is implemented, what is not, what is in flight>

## Goal

<what becomes true, for whom, and what this page therefore owns>

## Actors

- **<Role>** (`<claim>`) — <part in this use case>, lane `<CODE>`.
- **<Role>** — not an actor here, because <why it is named anyway>.

## Lanes

| Code     | Kind   | Binding                    |
| -------- | ------ | -------------------------- |
| `<CODE>` | actor  | <role from [[User Roles]]> |
| `<CODE>` | system | <app, function or store>   |

## Aggregate

`<Name>`, in `<collection>`. States it can be left in: `<a>`, `<b>`, `<c>`.

## Scope

In scope: <...>

**Completeness.** `<collection>` is written by <...>. <Which are steps here, which are
excluded, and why.>

Out of scope. Each of these is its own Use Case, referenced from the step it belongs to:

| UC-ID    | Use Case           | Referenced at | Direction                                                                                     |
| -------- | ------------------ | ------------- | --------------------------------------------------------------------------------------------- |
| `UC-XXX` | <name or [[page]]> | `<StepId>`    | <Upstream \| Downstream \| Enclosing \| Invoked step \| Optional step \| Alternative outcome> |

## Trigger

<what starts it; state explicitly whether any automatic trigger exists>

## Preconditions

| #   | Precondition | Owner    |
| --- | ------------ | -------- |
| P1  | <...>        | `UC-XXX` |

**Not a precondition:** <what a reader would wrongly assume>

## Guarantees

On the successful path, `END-X<n>`:

| #   | Guarantee                       |
| --- | ------------------------------- |
| G1  | <...>, satisfying `UC-XXX` `P1` |

## Flow

<`UF-4a`: the behaviour as prose bullets. Removed at L2, where the actogram enumerates it>

- <...>

## Actogram

The flow below is a text actogram; the notation is defined in [[Actogram Format]].

### Phase 1 - <the actor's sub-goal>
```

X1 <LANE> <action>
@ <locus>
└─→ <LANE> <effect>
└─◁ <LANE> <perception>
INV:R-1
→ X2

```

### Mechanism - <name>

```

X5 SYS <action>
@ <function, file>
├─ <condition> → END-X<n>
└─ <condition> → X6

```

### Terminal States

| End      | Kind    | Aggregate state | Perception                    | Meaning       |
| -------- | ------- | --------------- | ----------------------------- | ------------- |
| `END-X1` | Success | `<state>`       | <what the actor is left with> | G1 to Gn hold |

## Rules And Invariants

| ID      | Normative statement | Code anchor          |
| ------- | ------------------- | -------------------- |
| **R-1** | <...>               | `<file>`, `<symbol>` |

## Exceptions And Failure Modes

| #   | Situation | Behaviour | Assessment        |
| --- | --------- | --------- | ----------------- |
| E1  | <...>     | <...>     | Defect, \#<issue> |

## Authorization

**Enforced.** <...>

**Not enforced.** <...>

## MVP Classification

**[MVP]** — <steps and terminals>
**[Secondary]** — <steps and terminals, with the issue that owns each>
<or, instead of both lines above — UF-21>
**[Obsolete]** — <one line reason, with the issue that owns the deletion>

## App Store Review Area

<which Apple or Google requirement, or "not relevant, because ...">

## Related GitHub Scope

- Part of [[epic-<n>]]
- <what each issue contributes>

## Related Domains

- [[<Domain>]]

## Related Pages

- [[<page>]]
```

## Use Case Code Registry

| UC-ID    | Use Case                                         | Page                                              |
| -------- | ------------------------------------------------ | ------------------------------------------------- |
| `UC-DRC` | Detect Restaurant Candidate                      | [[UC - Detect Restaurant Candidate]]              |
| `UC-VRC` | Verify Restaurant Candidate                      | [[UC - Verify Restaurant Candidate]]              |
| `UC-OPS` | Operate BiteTribe In The Admin App               | [[UC - Operate BiteTribe In The Admin App]]       |
| `UC-ROM` | Run Operational Migrations                       | [[UC - Run Operational Migrations]]               |
| `UC-CMB` | Create And Maintain Personal Bites               | [[UC - Create And Maintain Personal Bites]]       |
| `UC-MRB` | Maintain Restaurants In The Business App         | [[UC - Maintain Restaurants In The Business App]] |
| `UC-ARO` | Own And Claim Restaurants                        | [[UC - Own And Claim Restaurants]]                |
| `UC-DSB` | Discover Bites                                   | [[UC - Discover Bites]]                           |
| `UC-IBD` | Inspect Bite Details                             | [[UC - Inspect Bite Details]]                     |
| `UC-DIS` | Dismiss Restaurant Candidate                     | none                                              |
| `UC-MRC` | Resolve Candidate Against An Existing Restaurant | none                                              |
| `UC-GIM` | Generate Initial Menu From Bite Evidence         | none                                              |
| `UC-ARB` | Assign Bites To Restaurant                       | none                                              |

Codes whose `Page` cell reads `none` have no page yet. They are referenced by `UC-VRC`
and `UC-DRC` for rules those flows depend on, which makes writing them visible work
rather than an omission.

A deleted page's row goes with it (`UF-23`). The code is then unclaimed, and `UF-10`
governs it again like any other: it is claimed here before it is used, which is what
stops it being reused while anything still refers to it.

## Related Pages

- [[Actogram Format]]
- [[GitHub Issue Format]]
- [[Agent Operating Contract]]
- [[Traceability Map]]
- [[User Roles]]
- [[Glossary]]
- [[Current State - Known Issues]]
