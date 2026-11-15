# GitHub Issue Format

## Purpose

This page defines how a GitHub issue is written for this repository.

It exists because the format was previously only implicit. Forty `issue-*` pages follow a recognisable shape, but nothing stated it, so a new issue could only be written by imitation rather than checked against a rule.

## Scope

This page governs **GitHub issues**, epics included.

- **An epic is written in `Shape 3 - Epic`.** The rest of this page applies to an epic except where Shape 3 says otherwise.
- **Use cases are excluded.** A `UC - *` page has its own format, defined in [Use Case Format](use-case-format.md), with its flow notation in [Actogram Format](actogram-format.md).
- **It applies to issues created from 4 September 2026 onward.** Existing issues are not retrofitted. Updating an existing issue does not change its structure either: an issue keeps the shape it was filed with for its whole life, and only its content is edited.
- **The SSOT does not mirror issues.** There is no `issue-*` page to keep in step with an issue body; for the current state of an issue, ask GitHub. What the SSOT keeps is the closing report, as a comment on the issue (see `Closing Report`) and, where the work produced a durable rule, on the page that owns it. Reports written before that rule was stated are in [records/](../history/records/README.md).

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

An epic title is `epic: description`, lower case and stating the outcome, with no scope and no ordinal.

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

| Section                 | When                                                                       | Content                                                                               |
| ----------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `Description`           | optional after the story sentence                                          | The problem in prose. The story sentence alone is not a description.                  |
| `Technical Details`     | optional                                                                   | Paths, identifiers, constants, functions. Name the exact artefact, not "the service". |
| `Business Details`      | optional                                                                   | Commercial or product rationale, entitlement or pricing consequences.                 |
| `Acceptance Criteria`   | when the contract is non-trivial                                           | See Acceptance Criteria below. Not mandatory for every issue.                         |
| `Out Of Scope`          | when something was deliberately excluded, and always after an INVEST split | So the exclusion is not re-litigated.                                                 |
| `App Store Review Area` | always                                                                     | See App Store Review Area below.                                                      |
| `Related Issues`        | always                                                                     | See Related Issues below.                                                             |

## Shape 2 - Retrospective

For a defect or a change already implemented. **The user-story form is not used.** The body opens with `Description`.

| Section                 | When     | Content                                                                    |
| ----------------------- | -------- | -------------------------------------------------------------------------- |
| `Description`           | always   | The problem in prose, and how it was observed.                             |
| `Findings`              | always   | What the investigation established. A second finding gets its own heading. |
| `Decisions`             | always   | What was decided and why, including options rejected.                      |
| `Outcome`               | always   | What changed, by exact path.                                               |
| `Technical Details`     | optional | Where `Outcome` needs supporting detail.                                   |
| `Business Details`      | optional | Commercial or product consequences of the change.                          |
| `Out Of Scope`          | optional | What was deliberately not fixed here.                                      |
| `Validation`            | always   | Which commands ran, which files were read.                                 |
| `Open`                  | always   | What is still unverified, and why. "Nothing open." is a valid entry.       |
| `App Store Review Area` | always   | See App Store Review Area below.                                           |
| `Related Issues`        | always   | See Related Issues below.                                                  |

## Shape 3 - Epic

For an epic: an outcome larger than one issue, delivered by several issues. **It applies to epics filed after [#2004] was merged.** Existing epics keep the shape they were filed with, as issues do.

The body opens with one or two sentences stating the outcome, before the first heading. It does not repeat the title as a heading and does not use the user-story sentence. INVEST applies to the epic's stories, not to the epic.

| Section                 | When                                     | Content                                                                                                                                                                                                                                                                                                   |
| ----------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Description`           | always                                   | The problem, the current state, and why this is an epic of its own and why now.                                                                                                                                                                                                                           |
| `Goal`                  | always                                   | What is true once every story has landed.                                                                                                                                                                                                                                                                 |
| `Scope`                 | always                                   | The areas the epic covers, one `###` per area, and in prose how it splits into stories. The stories themselves are not listed by number.                                                                                                                                                                  |
| `Decisions`             | when a decision is already taken         | What was decided for the epic as a whole, and the options rejected.                                                                                                                                                                                                                                       |
| `Open Questions`        | optional                                 | An open question is recorded in [Current State - Open Questions](../current-state/open-questions.md), which is where it is maintained. The epic may link to the ones that block one of its stories; it does not hold a question of its own. When a question is settled, the decision goes to `Decisions`. |
| `Success Criteria`      | always                                   | Outcomes of the whole epic that can be checked once it is done. Not tasks, and not a copy of the stories' acceptance criteria.                                                                                                                                                                            |
| `Validation`            | when a check spans more than one story   | A check that no single story owns, for example a rule-test suite that must cover every protected collection before the epic is done.                                                                                                                                                                      |
| `Out Of Scope`          | when something was deliberately excluded | So the exclusion is not re-litigated.                                                                                                                                                                                                                                                                     |
| `App Store Review Area` | always                                   | As for an issue. Where the stories differ, name which ones touch the review.                                                                                                                                                                                                                              |
| `Related Issues`        | always                                   | `Depends on #1234` names another **epic**, with the reason. A single issue is named only when it blocks this epic and belongs to no epic. `Related to #1234` for everything else. An epic is never `Part of` another issue.                                                                               |

- **An epic is the largest unit of work.** There is no level above it and no epic of epics: an epic is never part of another epic, and its children are issues, never epics. Work too large for one epic is split into several epics, which state their order with `Depends on`.
- **Child issues are linked as native sub-issues**, never listed in the body; see [Sub-Issues](github-project-board-and-issue-handling.md#sub-issues). Each child also carries `Part of #<epic>` under `Related Issues`. A dependency that affects only one story is stated on that story, not on the epic.
- **An epic carries no acceptance criteria.** Its stories carry the testable ones; the epic carries `Success Criteria`.
- **When the last story is merged**, the epic gets a closing report in the `Closing Report` form below, covering the epic as a whole.

## Acceptance Criteria

**Acceptance criteria are assertions about system behaviour that a test could fail** - not tasks, and not decisions to be taken.

`[ ] Glossary updated`, `[ ] Decision made` and `[ ] Rationale documented` are not acceptance criteria. They are process.

A decision that has not yet been taken belongs in [Current State - Open Questions](../current-state/open-questions.md), not in an acceptance criterion.

### The Use-Case Assertion

Where an issue closes a gap that a use case carries as a rule, guarantee or exception marked _Intended, not met_, the **last** acceptance criterion asserts that the marker is gone:

```text
- [ ] `UC - Detect Restaurant Candidate` no longer marks `G7` as *Intended, not met*.
```

This is an assertion, not the process entry ruled out above. It names one artefact and one identifier, it is false until the work lands, and it is checked by reading a single line. `[ ] Use case updated` is the process form and stays excluded, as does anything that does not name the identifier it settles.

It exists because an id can survive a rewrite while its meaning moves, and because a rule marked _Intended, not met_ is the one place the SSOT admits the code and the specification disagree. Nothing else in the issue makes the closing of that admission checkable.

Two limits:

- **It applies only where such a marker exists.** An issue that closes nothing marked in a use case carries no criterion of this kind, and no issue invents a marker in order to have one.
- **Where two issues together close one marker**, because the rule states both halves, the criterion belongs on the issue that lands second. The first names the half it delivers in its traceability sentence instead.

The same form applies to deletion. Where an issue removes the code behind a use case marked `[Obsolete]` ([Use Case Format](use-case-format.md) `UF-21`), the **last** acceptance criterion asserts the page is gone:

```text
- [ ] `UC - <name>` is deleted, with its entry removed from the SSOT index and the use-case code registry.
```

The deletion itself is defined by [Use Case Format](use-case-format.md) `UF-23`; the criterion only makes it checkable from the issue.

This is the one exception to the rule that traceability is not recorded in the issue body. It records a _contract_, not a cross-reference: the cross-reference still belongs on the use-case page.

## App Store Review Area

**This section is never omitted.**

If Apple or Google requirements are relevant, name which: permission, privacy nutrition label entry, review guideline, Capacitor plugin capability, store listing copy or screenshot.

If they are not, write "not relevant, because ...". A missing section reads as "not yet considered" rather than as "considered and cleared".

See [Implementation - Store Declarations](../implementation/store-declarations.md) and [Implementation - Store Listing Assets](../implementation/store-listing-assets.md) for the declarations an answer here has to match.

## Related Issues

A link states its kind, using one of three forms, in this order:

- `Depends on #1234` - this issue cannot be merged before that one, with the reason stated. An ordinal alone does not survive someone picking issues off the board out of order.
- `Part of #1234` - the owning epic.
- `Related to #1234` - everything else: a superseded issue, a follow-up, or the existing issue found by the search rule below.

An epic uses only `Depends on` and `Related to`, with the meaning its `Related Issues` row in `Shape 3 - Epic` gives them: there, `Depends on` names another epic. An epic is never `Part of` another issue.

On GitHub, use `#1234`. In the SSOT, write it as a reference link - `[#1234]` in the text, with its definition at the end of the page.

**`Part of #1234` is prose, not a relationship GitHub tracks.** An issue that is `Part of` an epic must also be attached as a native GitHub sub-issue of that epic - see [Sub-Issues](github-project-board-and-issue-handling.md#sub-issues). Writing the line without doing that step leaves the epic's own checklist and progress bar blank.

Domain, use-case, epic and architecture traceability is not recorded here. It belongs on the use-case page, in its `Related GitHub Scope` section, which [Use Case Format](use-case-format.md) `UF-4` requires and never omits from L1 up (optional while a page is still at `L0`).

## Status

**Status, priority and type live on the board, not in the issue body.** Do not write `Status:` or `Priority:` lines into a GitHub issue. GitHub's own issue state and the board fields serve that purpose. See [GitHub Project Board And Issue Handling](github-project-board-and-issue-handling.md) for the board, the fields, the label vocabulary and the commands.

## Closing Report

**When work on an issue finishes, the report is a comment on that issue.** It is not a
file in the SSOT. A comment is authored and dated, and the work it describes happened
once; a page states what is true now.

The comment carries only what is true of this piece of work:

```text
**Findings** - what was actually wrong, established from evidence rather than repeated
from the report.
**Decisions** - what was chosen, and what was refused, with the reason.
**Outcome** - the files that changed and what each one now does.
**Validation** - the commands that ran, and their result.
**Open** - what is still unsettled, and anything deliberately not run.
```

A section with nothing to say is omitted. `Outcome` and `Validation` never are.

**A durable rule that came out of the work does not go in the comment.** It goes onto the
SSOT page that owns it - an `Architecture - *` page, a domain page, or
[Current State - Known Issues](../current-state/known-issues.md) - and the comment links
there. The test is whether the statement is still true next quarter: if it is, it belongs
on the page; if it is only true of this fix on this day, it belongs in the comment.

## MVP Classification

MVP is the core functionality strictly required for the initial release. Anything beyond that is secondary.

The classification is recorded on the board as `Priority`, not in the issue body:

| Classification | Board `Priority`                 |
| -------------- | -------------------------------- |
| `[MVP]`        | `P0`                             |
| `[Secondary]`  | `P1` to `P4`, by the scale below |

`P0` is MVP: launch-critical, and a decision with a named consequence rather than an observation, as [GitHub Project Board And Issue Handling](github-project-board-and-issue-handling.md) defines it. `P1` is what should be done immediately after MVP. `P2` is relevant, but the software works without it. `P3` is relevant in the future. `P4` is close to irrelevant. `P5` is unused.

## Before Filing

Search for an existing issue on the same subject and link it rather than duplicating it.

## Related Pages

- [GitHub Project Board And Issue Handling](github-project-board-and-issue-handling.md)
- [Feature Delivery Workflow](feature-delivery-workflow.md)
- [Spec To Code Workflow](spec-to-code-workflow.md)
- [Agent Operating Contract](agent-operating-contract.md)
- [Current State - Open Questions](../current-state/open-questions.md)

[#2004]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2004
