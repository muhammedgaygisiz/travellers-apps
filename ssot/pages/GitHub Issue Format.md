# GitHub Issue Format

## Purpose

This page defines how a GitHub issue is written for this repository.

It exists because the format was previously only implicit. Forty `issue-*` pages follow a recognisable shape, but nothing stated it, so a new issue could only be written by imitation rather than checked against a rule.

## Scope

This page governs **GitHub issues**, and only issues.

- **Epics are excluded.** An `epic-*` page keeps its own shape.
- **Use cases are excluded.** A `UC - *` page has its own format, defined in [[Use Case Format]], with its flow notation in [[Actogram Format]].
- **It applies to issues created from 4 September 2026 onward.** Existing issues are not retrofitted. Updating an existing issue does not change its structure either: an issue keeps the shape it was filed with for its whole life, and only its content is edited.
- **The SSOT mirror page is a different artefact.** `issue-*` pages in this graph are Logseq outline blocks, not `##` headings, and they carry context the GitHub issue does not. See Status And The Mirror Page.

## Language And Form

An issue is written in English, in standard Markdown, and respects the **INVEST** criteria.

If it cannot be delivered and demonstrated on its own, split it and name the split in `Out Of Scope`.

Section titles are used verbatim, as `##` headings, in the order the shape below gives. A section is omitted only where its `When` column says it is optional.

## Title Format

An issue title is `type(scope): description`, optionally prefixed with an ordinal:
`NN - type(scope): description`.

- `type` follows the vocabulary already in use: `feat`, `fix`, `refactor`, `docs`, `security`, `test`, `spec`, `launch`, `ci`, `perf`.
- `scope` in parentheses names the app or library where the change lands, for example `feat(bite-tribe-admin)` or `fix(backend)`. It is omitted where the change has no single home, as in `docs:`.
- `description` is lower case and states the outcome, not the task.

### The Ordinal

`NN` is a two-digit ordinal starting at `01`, sequencing an issue within its epic.

**It is optional, and omitted by default.** It is carried only where the issues of an epic have an intended working order that a reader benefits from seeing at a glance. Epic membership alone does not call for one: issues that belong to the same epic and can be picked up in any order carry no ordinal.

An ordinal is a reading aid, never the dependency record. Where one issue genuinely cannot be merged before another, that is stated as `Depends on #1234` under `Related Issues`, with the reason.

An issue filed outside an epic never carries an ordinal.

## Shape 1 - Spec-Ahead

For work not yet implemented. The body opens with the intent, before the first heading:

```text
As a [role/user] I want [function/action], so that [benefit/goal].
```

| Section | When | Content |
| --- | --- | --- |
| `Description` | optional after the story sentence | The problem in prose. The story sentence alone is not a description. |
| `Technical Details` | optional | Paths, identifiers, constants, functions. Name the exact artefact, not "the service". |
| `Business Details` | optional | Commercial or product rationale, entitlement or pricing consequences. |
| `Acceptance Criteria` | when the contract is non-trivial | See Acceptance Criteria below. Not mandatory for every issue. |
| `Out Of Scope` | when something was deliberately excluded, and always after an INVEST split | So the exclusion is not re-litigated. |
| `App Store Review Area` | always | See App Store Review Area below. |
| `Related Issues` | always | See Related Issues below. |

## Shape 2 - Retrospective

For a defect or a change already implemented. **The user-story form is not used.** The body opens with `Description`.

| Section | When | Content |
| --- | --- | --- |
| `Description` | always | The problem in prose, and how it was observed. |
| `Findings` | always | What the investigation established. A second finding gets its own heading. |
| `Decisions` | always | What was decided and why, including options rejected. |
| `Outcome` | always | What changed, by exact path. |
| `Technical Details` | optional | Where `Outcome` needs supporting detail. |
| `Business Details` | optional | Commercial or product consequences of the change. |
| `Out Of Scope` | optional | What was deliberately not fixed here. |
| `Validation` | always | Which commands ran, which files were read. |
| `Open` | always | What is still unverified, and why. "Nothing open." is a valid entry. |
| `App Store Review Area` | always | See App Store Review Area below. |
| `Related Issues` | always | See Related Issues below. |

## Acceptance Criteria

**Acceptance criteria are assertions about system behaviour that a test could fail** - not tasks, and not decisions to be taken.

`[ ] Glossary updated`, `[ ] Decision made` and `[ ] Rationale documented` are not acceptance criteria. They are process.

A decision that has not yet been taken belongs in [[Current State - Open Questions]], not in an acceptance criterion.

### The Use-Case Assertion

Where an issue closes a gap that a use case carries as a rule, guarantee or exception marked *Intended, not met*, the **last** acceptance criterion asserts that the marker is gone:

```text
- [ ] `UC - Detect Restaurant Candidate` no longer marks `G7` as *Intended, not met*.
```

This is an assertion, not the process entry ruled out above. It names one artefact and one identifier, it is false until the work lands, and it is checked by reading a single line. `[ ] Use case updated` is the process form and stays excluded, as does anything that does not name the identifier it settles.

It exists because an id can survive a rewrite while its meaning moves, and because a rule marked *Intended, not met* is the one place the SSOT admits the code and the specification disagree. Nothing else in the issue makes the closing of that admission checkable.

Two limits:

- **It applies only where such a marker exists.** An issue that closes nothing marked in a use case carries no criterion of this kind, and no issue invents a marker in order to have one.
- **Where two issues together close one marker**, because the rule states both halves, the criterion belongs on the issue that lands second. The first names the half it delivers in its traceability sentence instead.

This is the one exception to the rule that traceability is not recorded in the issue body. It records a *contract*, not a cross-reference: the cross-reference still belongs on the use-case page.

## App Store Review Area

**This section is never omitted.**

If Apple or Google requirements are relevant, name which: permission, privacy nutrition label entry, review guideline, Capacitor plugin capability, store listing copy or screenshot.

If they are not, write "not relevant, because ...". A missing section reads as "not yet considered" rather than as "considered and cleared".

See [[Implementation - Store Declarations]] and [[Implementation - Store Listing Assets]] for the declarations an answer here has to match.

## Related Issues

A link states its kind, using one of three forms, in this order:

- `Depends on #1234` - this issue cannot be merged before that one, with the reason stated. An ordinal alone does not survive someone picking issues off the board out of order.
- `Part of #1234` - the owning epic.
- `Related to #1234` - everything else: a superseded issue, a follow-up, or the existing issue found by the search rule below.

On GitHub, use `#1234`. On the SSOT mirror page, use `[[issue-1234]]`.

Domain, use-case, epic and architecture traceability is not recorded here. It belongs on the use-case page, in its `Related GitHub Scope` section, which [[Use Case Format]] `UF-4` requires and never omits.

## Status And The Mirror Page

**Status, priority and type live on the board, not in the issue body.** Do not write `Status:` or `Priority:` lines into a GitHub issue. GitHub's own issue state and the board fields serve that purpose. See [[GitHub Project Board And Issue Handling]] for the board, the fields, the label vocabulary and the commands.

**An SSOT `issue-*` page may carry a `Status` section, and a GitHub issue may not.** The mirror page is written after the fact and its `Status` states what the page is - for example "Implemented. This page records the agreed specification the implementation was built against." That is a statement about the document, not a board field, and it has no equivalent in the issue body.

## MVP Classification

MVP is the core functionality strictly required for the initial release. Anything beyond that is secondary.

The classification is recorded on the board as `Priority`, not in the issue body:

| Classification | Board `Priority` |
| --- | --- |
| `[MVP]` | `P0` |
| `[Secondary]` | `P1` to `P4`, by the scale below |

`P0` is MVP: launch-critical, and a decision with a named consequence rather than an observation, as [[GitHub Project Board And Issue Handling]] defines it. `P1` is what should be done immediately after MVP. `P2` is relevant, but the software works without it. `P3` is relevant in the future. `P4` is close to irrelevant. `P5` is unused.

## Before Filing

Search for an existing issue on the same subject and link it rather than duplicating it.

## Related Pages

- [[GitHub Project Board And Issue Handling]]
- [[Feature Delivery Workflow]]
- [[Spec To Code Workflow]]
- [[Agent Operating Contract]]
- [[Current State - Open Questions]]
