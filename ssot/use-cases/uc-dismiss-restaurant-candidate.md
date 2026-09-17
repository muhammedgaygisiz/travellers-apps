# UC - Dismiss Restaurant Candidate

## Status

**Level:** L0.

No page exists yet; the behaviour is named only where two other pages depend on it.
`UC-DRC` `K9` (guard against writing onto a decided Candidate) and `R-18` (permanent
suppression of a re-proposed place) both require a `dismissed` Candidate to exist.
`UC-VRC` `V4a` is the Operator's decision branch that would produce one, and both pages
mark their side `[not implemented]` (`UC-VRC` `R-13`). No surface and no backend writer
exist anywhere in the codebase today - a repository-wide search for candidate-dismissal
code returns nothing but unrelated UI modal/alert dismissals. The model already declares
`'dismissed'` as one of the `RestaurantCandidateStatus` values, so the target shape is
agreed even though nothing produces it. Three issues already own pieces of this, all
`[Secondary]` in epic [#1495]: [#1501] the backend writer, [#1508] the Operator surface,
and [#1502] un-dismissal.

## Goal

An Operator who judges a `pending` RestaurantCandidate not to be a real restaurant can
say so once, from the same surface where they verify one, leaving it `dismissed` so it
stops appearing in the verification queue - and, once `UC-DRC` `R-8`'s guard exists, is
not proposed again at the same derived identity. The write touches only `status`, an
optional reason and a verification-style audit trail: `biteIds` and `evidence` are left
exactly as they stand, so a later un-dismissal ([#1502]) restores the same Candidate with
the same evidence, nothing re-derived and nothing lost.

## Actors

- **BiteTribe Operator** - the only actor; the same Operator, in the same Admin App
  surface, who verifies Candidates (`UC-VRC` `V4`).

## Flow

- The Operator reaches this decision at `UC-VRC` `V4`, judging a listed Candidate not to
  be a real restaurant (a festival stand, a home kitchen, a supermarket deli -
  `UC-DRC` `E8`).
- The Operator dismisses it from the same surface, optionally giving a reason, without
  leaving the Candidate list.
- The Candidate is left `status: 'dismissed'`, plus an audit trail mirroring
  verification's own (`dismissedByUserId`, `dismissedAt`, `dismissedAtTimestamp`) and an
  optional `dismissReason` string. `biteIds` and `evidence` are untouched.
- The Candidate disappears from the pending list `UC-VRC` `V2` reads.
- Un-dismissal ([#1502]) reverses the status write and restores the Candidate with the
  same evidence intact; whether it also clears `dismissReason` is undecided.

## MVP Classification

**[Secondary]** - per `UC-VRC`'s own classification: dismissal is "deliberately out of
the release: dismissal is inert without `UC-DRC` `R-8`'s guard... The release fix for
the queue is the cap at `V2`, not dismissal." Best guess; revisit once this page reaches
L1.

## Related GitHub Scope

- Part of epic [#1495]
- [#1501] - the backend writer
- [#1508] - the Operator surface
- [#1502] - un-dismissal

## Related Domains

- [Restaurant](../domain/restaurant.md)
- [Bite](../domain/bite.md)

[#1495]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1495
[#1501]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1501
[#1502]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1502
[#1508]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1508
