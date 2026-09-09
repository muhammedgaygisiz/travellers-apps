# Actogram Format

Companion page: [[Use Case Format]] — this page defines the actogram itself;
that page defines the use-case page that contains one.

## Purpose

This page is the **normative definition of an actogram** in this project. It is written
so that a human or an AI agent can produce a conforming actogram from a specification or
from code without seeing another example, and so that a reviewer can decide conformance
by rule id rather than by taste.

Rules are numbered `AF-n` and are citable from issues, reviews and other pages. `MUST`
rules are conformance conditions. `SHOULD` rules may be broken where the page states why.

## What An Actogram Is

An actogram models an **action sequence between actors and a system**, over one named
object, ending in named terminal states.

Its defining property is the **turn**: an actor acts, the system reacts, and the actor
perceives enough of that reaction to take the next action. A description of system
behaviour with no actor and no perception is a **mechanism**, not an actogram. Both
belong in a use case, both use the notation on this page, and they are not the same
thing and are not counted as the same thing.

An actogram is **descriptive**, never aspirational: it states what happens, and intent
that is not built is recorded as a rule, not as a step.

## Element Model

An actogram consists of exactly these elements. An agent producing an actogram is
producing instances of this model.

| Element | Fields |
|---|---|
| **Aggregate** | name; the set of states it can be left in; the collections it lives in |
| **Lane** | code; kind (`actor` \| `system` \| `external`); binding (a role from [[User Roles]], a named function or app, or a named third party) |
| **Step** | id; lane; action; locus; effects[]; perceptions[]; basis (decision steps); annotations[]; exactly one exit |
| **Effect** | target lane; what this step causes there |
| **Perception** | actor lane; what that actor sees, reads or is told |
| **Branch** | condition; target (step id or terminal id); direction (forward or loop) |
| **Terminal state** | id; kind; aggregate state; perception; meaning |
| **Reference** | referenced use-case id; the guarantee that use case owes at this step |
| **Invariant link** | rule id; whether the step upholds or violates it |

A step's **class is derived, not declared**: a step on an `actor` lane is an
*interaction step*; a step on a `system` or `external` lane is a *mechanism step*.

## Notation

```
<StepId>  <LANE>  <action, present tense, one clause>        [<marker>...]
          @ <locus>
          └─→ <LANE>  <what this step causes in that lane>
          └─◁ <LANE>  <what that actor perceives>
          BASIS: <the information available to the actor at this moment>
          REF:<UC-ID>   <the guarantee that Use Case owes here>
          INV:<R-x>
          INV:<R-x> is VIOLATED here: <how the as-built behaviour breaks it>
          ENTRY:<X>  <how this step differs when reached by the path whose prefix is X>
          NOTE: <as-built remark that is not a rule>
          → <StepId>                              unconditional successor
          ├─ <condition> → <StepId | END-x>       branch
          ├─ <condition> ↺ <StepId>               loop: branch to an earlier step
          └─ <condition> → <StepId | END-x>       the last branch
```

Every construct used in an actogram in this graph is in the list above. There is no
other legend, and a page does not carry a copy of this one.

### Markers

| Marker | Meaning |
|---|---|
| `[decision]` | The action is an actor's judgement, not an observable interaction. Requires a `BASIS:` line. Carries no test claim |
| `[optional]` | Skippable. The guarantees still hold without it |
| `[not implemented]` | Specified and absent from the code. Requires an `INV: … is VIOLATED here` line |
| `[conditional: <what>]` | Runs only in the named case, where that case is not a branch of its own |

### Headings

- `### Phase <n> - <name>` groups interaction steps by the actor's sub-goal. A phase
  carries no id and no rule; its name states the sub-goal.
- `### Mechanism - <name>` groups mechanism steps. Required by `AF-21`.
- `### Entry <X> - <name>` groups the steps of one entry where a page has several.
- `### Terminal States` carries the terminal table.

### Step Ids

`<Prefix><n>`, one capital letter per entry, plus `K` reserved for a kernel shared by
several entries. A page with one entry uses one prefix.

## Normative Rules

### Aggregate And Lanes

- **AF-1** The actogram MUST name the aggregate it acts on, and enumerate the states
  that aggregate can be left in. Every terminal state MUST resolve to one of them.
- **AF-2** Lanes MUST be declared before the first step, each with a code, a kind and a
  binding.
- **AF-3** Lane codes MUST come from the vocabulary below. An `actor` lane MUST bind to a
  role defined in [[User Roles]]. A page MUST NOT invent an actor lane.
- **AF-4** An actogram MUST contain at least one interaction step. A flow with no actor
  is a mechanism; it is written under `### Mechanism` inside the use case whose actor
  causes it, and it is not called an actogram.
- **AF-5** There is no null lane. An event caused outside this use case is a
  precondition, or a `REF:` on the first step — never a step with no lane.

| Code | Kind | Lane |
|---|---|---|
| `BC` | actor | Bite Creator, a signed-in consumer user |
| `GU` | actor | Guest, unauthenticated visitor |
| `OP` | actor | BiteTribe Operator (`admin`) |
| `RO` | actor | Restaurant Owner (`business`) |
| `TC` | actor | BiteTrail Creator (proposed `curator`) |
| `UI` | system | A client app, named in the lane declaration |
| `NAT` | system | The native layer: Capacitor plugin, OS permission dialog, store client |
| `SYS` | system | Backend, the function named at the step |
| `DB` | system | Firestore, or Storage where the page says so |
| `EXT` | external | A named third party |

`NAT` is separate from `UI` deliberately. It is where every App Store review question
lands, and folding it into `UI` makes those questions invisible.

### Steps

- **AF-6** One step is one action by exactly one lane, in present tense, in one clause.
  An action containing "and" is two steps.
- **AF-7** The line order inside a step MUST be: action, `@` locus, effects, perceptions,
  `BASIS:`, `REF:`, `INV:`, `ENTRY:`, `NOTE:`, exit.
- **AF-8** An effect MUST NOT be an action by an `actor` lane. An actor's turn inside an
  effect list is a step of its own.
- **AF-9** Every step MUST have exactly one exit: one successor, or one branch set.
  Never both, never neither.
- **AF-10** A step MUST have a domain effect, a decision, a boundary crossing or a
  perception. Pure client-side navigation is not a step. A step that restates the
  guarantees is not a step.
- **AF-11** Step ids MUST be unique within the page and MUST NOT be renumbered or reused.
  A removed step's id is retired. A step inserted between `V7` and `V8` is `V7a`.
- **AF-12** Every step SHOULD name its locus with `@` — route, component, callable or
  trigger. At L3 (see [[Use Case Format]]) it MUST.
- **AF-13** A step whose code does not exist MUST carry `[not implemented]` and an
  `INV: … is VIOLATED here` line naming a rule marked *Intended, not met*.
- **AF-14** Semantics of a written field or document belong in a rule, not in an effect
  line. An effect states *that* the step writes; the rule states *what the value means*.

### Perception

- **AF-15** A mechanism run that returns control to an actor MUST end with a perception
  line (`└─◁`) stating what that actor perceives — **unless the run ends at a terminal
  state.** There the perception is carried by the terminal table, which `AF-16` already
  requires and `UF-7` forbids restating on the step. The rule therefore binds a run that
  hands control back mid-flow, which is where the perception would otherwise go unstated.
- **AF-16** Every terminal state reachable by an actor MUST name the perception that
  actor is left with.
- **AF-17** An error code is not a perception. A perception MUST be stated as what the
  actor sees, reads or is told. `permission-denied` is an effect; "the sign-in fails with
  the generic message" is a perception.
- **AF-18** Where an actor can leave the flow mid-way, the step or terminal state MUST
  state what survives and what is discarded — including client-side drafts.

### Decisions

- **AF-19** A step whose action is an actor's judgement MUST carry `[decision]` and a
  `BASIS:` line naming the information actually available at that moment.
- **AF-20** A `[decision]` step MUST NOT be given a locus or a test claim. The
  interaction that expresses the decision is a separate step, and that step carries the
  locus.

### Mechanism

- **AF-21** Two or more consecutive mechanism steps MUST be grouped under
  `### Mechanism - <name>`. Mechanism steps do not count toward `AF-4`.
- **AF-22** Where several paths converge on shared steps — entries, mechanisms, or a
  mixture of the two — the path MUST be carried as state, and a step that behaves
  differently by path MUST declare each difference with an `ENTRY:` line naming that
  path's step-id prefix, rather than in prose or an inline annotation. The marker keeps
  the name `ENTRY:` whichever kind of path it names, because what it records is which
  way the step was reached.

### Branches And Terminal States

- **AF-23** A branch set MUST be exhaustive and mutually exclusive. The last branch uses
  `└─`.
- **AF-24** Every branch condition MUST have exactly one target, and every target MUST
  resolve to a step id or a terminal id in the same actogram.
- **AF-25** Two branches of one set MUST NOT have the same target. Where a condition
  changes state rather than control flow, it is an effect or a rule, not a branch.
- **AF-26** A branch to an earlier step MUST use `↺` and MUST state the condition under
  which the loop is left.
- **AF-27** Every path MUST end in a terminal state, and every declared terminal state
  MUST be reachable from at least one branch or successor.
- **AF-28** A terminal state's kind MUST be one of: `Success`, `Partial success`,
  `Idempotent success`, `Hand-over`, `Abort`, `Rejection`, `Refusal`.
- **AF-29** The terminal table's columns MUST be
  `End | Kind | Aggregate state | Perception | Meaning`.

### Boundaries

- **AF-30** A referenced use case that attaches to a step MUST appear as `REF:` at that
  step, with the guarantee it owes, and MUST NOT be described in terms of how it works.
  A use case that attaches to no step is named in the `Scope` out-of-scope table with its
  attachment point instead — a precondition id, a terminal id, or the point in the
  lifecycle it sits at. It MUST NOT be given a step to carry a `REF:`: a step exists only
  for a domain effect, a decision, a boundary crossing or a perception (`AF-10`), and one
  invented to hold a reference is not a step. The `Referenced at` column therefore carries
  a step id where `Direction` is `Invoked step`, `Optional step` or `Alternative outcome`,
  and a precondition or terminal id where it is `Upstream`, `Downstream` or `Enclosing`.
  **It is never empty:** a use case worth listing has an attachment point, and if none can
  be named it does not belong in the table.
- **AF-31** For every referenced use case and every precondition, the page MUST name the
  counterparty and state, in its own words, the guarantee that counterparty owes at that
  point. A `REF:` carries it inline (`AF-30`); a precondition carries it in the `Owner`
  column together with the precondition's own text. This is a statement about *this* page
  and is decidable from it alone. Whether the counterparty has written its side back is
  governed by `AF-34` and is never a conformance condition of this page.
- **AF-32** The actogram MUST carry a completeness claim: every writer of the aggregate
  is either represented as a step, or named as excluded with a reason.
- **AF-33** The actogram MUST be as-built at L3 and as-agreed at L2. Intent that is not
  built is a rule marked *Intended, not met*, never a step — except under `AF-13`.
- **AF-34** Where a referenced use case has a page that carries numbered guarantees, that
  guarantee MUST name this page's precondition, and the two statements MUST agree. A
  disagreement is a conformance failure on **both** pages. Where the counterparty has no
  page, or has one carrying no numbered guarantees, the obligation is *unanswered*: it is
  recorded where the page states its handshake, and it is a claim on `UF-20`'s migration
  order rather than a defect in this page. **A page does not reach a level by waiting for
  another page to reach one** — `UF-3` makes L1 a legitimate resting level, so a rule that
  made L2 conditional on a counterparty's level would make L2 unreachable by design.

## Terminal State Kinds

| Kind | Meaning |
|---|---|
| `Success` | The guarantees hold |
| `Partial success` | Some guarantees hold; the aggregate is left in a state the page names. Always also an entry in `Exceptions And Failure Modes` |
| `Idempotent success` | Nothing was written; an existing result was returned |
| `Hand-over` | Control passed to a named use case |
| `Abort` | The actor stopped. No side effect |
| `Rejection` | The system refused a caller. Names the returned error and the perception |
| `Refusal` | The system accepted the caller and refused a write on its own invariant |

## Procedure For An Agent

Follow in order. Each step's output is the input to the next.

1. **Name the aggregate** and enumerate the states it can be left in (`AF-1`).
2. **Declare the lanes**, with kinds and bindings (`AF-2`, `AF-3`).
3. **Write the interaction steps only** — the actor's turns, in order. For each: action,
   locus, perception, and `BASIS:` if it is a decision (`AF-6`, `AF-12`, `AF-15`,
   `AF-19`). Do not write any system step yet. If this list is empty, stop: this is a
   mechanism, not a use case with an actogram (`AF-4`).
4. **Expand each turn** where the actor acts more than once inside it, until every step
   has exactly one actor and one action (`AF-6`, `AF-8`).
5. **Write the mechanism runs** each interaction triggers, under
   `### Mechanism - <name>` (`AF-21`).
6. **Enumerate the exits.** For every step, list every way it can fail or be abandoned.
   Each becomes a branch to a terminal state. Assert exhaustiveness explicitly
   (`AF-23`, `AF-27`).
7. **Fill the terminal table**: kind, aggregate state, perception, meaning
   (`AF-28`, `AF-29`, `AF-16`).
8. **Extract the rules.** Every "always", "never", "only" or field-semantics sentence you
   were tempted to write into a step becomes `R-n` (`AF-14`, `AF-33`).
9. **Write the guarantees** from the success terminal state, then check the handshake
   against every referenced use case (`AF-30`, `AF-31`).
10. **Write the completeness claim** (`AF-32`).
11. **Run the validation checklist.** Report each failing rule id; do not silently fix
    the model to satisfy a check.

## Validation Checklist

Checks marked ⚙ are decidable from the text alone and are the intended scope of an
automated check.

| # | Check | Rule |
|---|---|---|
| 1 | ⚙ Every lane used in a step or effect is declared | AF-2 |
| 2 | ⚙ Every lane code is in the vocabulary | AF-3 |
| 3 | ⚙ At least one step is on an actor lane | AF-4 |
| 4 | ⚙ No step lacks a lane | AF-5 |
| 5 | ⚙ Step ids unique; no gaps introduced by renumbering | AF-11 |
| 6 | ⚙ Every step has exactly one exit | AF-9 |
| 7 | ⚙ Line order inside every step | AF-7 |
| 8 | ⚙ Every branch target resolves | AF-24 |
| 9 | ⚙ No branch set has two arms with the same target | AF-25 |
| 10 | ⚙ Every backward branch uses `↺` | AF-26 |
| 11 | ⚙ Every declared terminal is reached; every reached terminal is declared | AF-27 |
| 12 | ⚙ Every terminal kind is in the vocabulary | AF-28 |
| 13 | ⚙ Terminal table has the five required columns, none empty | AF-29 |
| 14 | ⚙ Every `[decision]` step has a `BASIS:` line and no locus | AF-19, AF-20 |
| 15 | ⚙ Every `[not implemented]` step has an `INV: … is VIOLATED here` line | AF-13 |
| 16 | ⚙ Every `INV:` names a rule in `Rules And Invariants` | AF-33 |
| 17 | ⚙ Every `REF:` names a use-case code in the registry in [[Use Case Format]] | AF-30 |
| 18 | ⚙ Every `Scope` out-of-scope row names an attachment point | AF-30 |
| 19 | ⚙ Every run of ≥2 mechanism steps sits under a `### Mechanism` heading | AF-21 |
| 20 | ⚙ At L3, every step has an `@` locus | AF-12 |
| 21 | ⚙ A completeness claim is present in `Scope` | AF-32 |
| 22 | ⚙ Every `REF:` and every precondition names a counterparty and the guarantee it owes | AF-31 |
| 23 | No effect line contains an actor action | AF-8 |
| 24 | Every mechanism run returning to an actor **mid-flow** ends in a perception; a run ending at a terminal is covered by AF-16 | AF-15 |
| 25 | No perception is stated as an error code | AF-17 |
| 26 | Every branch set is exhaustive | AF-23 |
| 27 | Where a referenced page carries numbered guarantees, the two statements agree | AF-34 |

## Worked Example

Illustrative only. It demonstrates every construct and asserts nothing about BiteTribe's
actual behaviour.

**Aggregate.** `Bite`. States it can be left in: `present`, `deleted`.

**Lanes.** `BC` actor, Bite Creator · `UI` system, consumer app ·
`SYS` system, `deleteBite` · `DB` system, Firestore.

```
### Phase 1 - Choosing to delete

D1   BC   opens their own Bite                             [interaction]
          @ bite-tribe, /bite/:id
          └─→ UI   reads DB  /bites/{biteId}
          └─◁ BC   sees the Bite with a delete action, only when they own it
          INV:R-1
          → D2

D2   BC   judges whether to delete it                      [decision]
          BASIS: the dish name, the photo, the review text and the price
          ├─ keeps it        → END-D1
          └─ deletes it      → D3

D3   BC   confirms the deletion                            [interaction]
          @ bite-tribe, bt-confirm-dialog
          └─→ SYS  calls deleteBite { biteId }
          → D4
```

```
### Mechanism - deletion

D4   SYS  enforces the caller's identity
          @ functions/delete-bite.ts, requireAuth
          ├─ not authenticated        → END-E1
          └─ authenticated            → D5
          INV:R-2

D5   SYS  checks ownership
          ├─ caller is not the creator → END-E2
          └─ caller is the creator     → D6

D6   SYS  deletes the Bite
          └─→ DB   /bites/{biteId} removed
          └─◁ BC   returns to the feed, which no longer lists the Bite
          INV:R-3
          → END-D2
```

### Terminal States

| End | Kind | Aggregate state | Perception | Meaning |
|---|---|---|---|---|
| `END-D1` | Abort | `present` | The Bite is still on screen | No side effect |
| `END-D2` | Success | `deleted` | The feed no longer lists it | `G1` holds |
| `END-E1` | Rejection | `present` | The sign-in prompt appears | `unauthenticated` |
| `END-E2` | Rejection | `present` | "You can only delete your own Bites" | `permission-denied` |

**Completeness.** `/bites` is written by this use case, by
`UC - Create And Maintain Personal Bites`, and by the retention job in
`UC - Run Operational Migrations`. The first two are steps; the third is excluded here
because it deletes without an actor.

## Related Pages

- [[Use Case Format]]
- [[User Roles]]
- [[Glossary]]
- [[Agent Operating Contract]]
