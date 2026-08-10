# GitHub Project Board And Issue Handling

## Purpose

This page fixes where issues live, how they are prioritised, and what a label is allowed to mean.

It exists because priority was being recorded inconsistently: workflow pages said "set Priority to `P0`" without naming the field or the board, release-candidate runs recorded severity in issue text alone, and one run created `P0` and `P1` labels that duplicated a field that already existed. All three describe the same fact in three places, and only one of them is the source of truth.

## The Board

There is exactly one project board for this repository, and it is an existing board rather than something to be created per epic or per run.

| Property       | Value                  |
| -------------- | ---------------------- |
| Name           | `Bite Tribe`           |
| Owner          | `muhammedgaygisiz`     |
| Project number | `4`                    |
| Project id     | `PVT_kwHOAzjNyc4A4Mjj` |

**Every new issue goes on this board.** This includes issues filed outside feature work, such as defects found during a release-candidate run.

`gh issue create` does **not** add an issue to a board. An issue created and left alone is invisible to the board, carries no priority and no status, and will not appear in any planning view. Adding it is a separate, explicit step.

## Fields

The board owns issue state. These are the fields that are set deliberately.

| Field      | Type          | Values                                                 |
| ---------- | ------------- | ------------------------------------------------------ |
| `Priority` | single select | `P0`, `P1`, `P2`, `P3`, `P4`, `P5`                     |
| `Status`   | single select | `Backlog`, `Ready`, `In progress`, `In review`, `Done` |
| `Size`     | single select | `XS`, `S`, `M`, `L`, `XL`                              |

### Priority

`P0` means launch-critical or currently selected for execution. It is the level that makes a build fail its release-candidate check in [[Current State - Release Candidate Test Charter]], so it is a decision rather than an observation: a finding is `P0` because someone accepted the consequence, not because it looked severe.

A defect that works exactly as written can still be `P0`. Issue #1308 is the reference case: nothing malfunctioned, and it was accepted as a release blocker because it published users' real names and defeated a privacy control the product offers.

Everything else defaults to `P1` unless there is a reason to sort it lower.

## Labels

**Labels carry type, never priority.**

- `bug`, `enhancement`, `documentation` describe what the issue is.
- `security` marks a disclosure or hardening concern rather than a functional defect.
- `business` marks the business app.

Do not create priority labels. If a `P0` or `P1` label appears in the repository, it is a mistake to remove rather than a convention to follow, because it competes with the board field and the two will disagree.

## How To File An Issue

1. Create the issue with `gh issue create`.
2. Add it to the board and keep the returned item id:

   ```
   gh project item-add 4 --owner muhammedgaygisiz \
     --url https://github.com/muhammedgaygisiz/travellers-apps/issues/<number> \
     --format json
   ```

3. Set `Priority`:

   ```
   gh project item-edit --project-id PVT_kwHOAzjNyc4A4Mjj \
     --id <item-id> --field-id <priority-field-id> \
     --single-select-option-id <option-id>
   ```

4. Set `Status` when work starts, and move it to `Done` after the pull request is merged and the behavior is verified.

Field and option ids are read with `gh project field-list 4 --owner muhammedgaygisiz` and a GraphQL `node` query against the field id. They are stable, so they can be looked up once per session rather than per issue.

This needs the `project` token scope on the authenticated `gh` CLI, in addition to `repo`.

## Rules

- Every new issue is added to the `Bite Tribe` board as part of filing it, not later.
- Priority is the board's `Priority` field. It is never a label, and never only prose inside the issue body.
- `P0` is a decision with a named consequence, and the reasoning belongs in a comment on the issue so the classification survives the conversation that produced it.
- Labels describe type only.
- An issue filed during a release-candidate run follows this page exactly as a feature issue does. The charter records the finding; the board records its priority.

## Related Pages

- [[Feature Delivery Workflow]]
- [[Agent Operating Contract]]
- [[Current State - Release Candidate Test Charter]]
- [[Release Workflow]]
