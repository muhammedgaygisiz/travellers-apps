# UC - Resolve Candidate Against An Existing Restaurant

## Status

**Level:** L0.

No page exists yet; referenced only by `UC-VRC` `V4b`/`END-V2`/`R-14`. No surface and no
backend writer exist - a repository-wide search turns up nothing beyond a vestigial,
unreachable `mergedIntoCandidateId` fallback inside `verifyRestaurantCandidate`, which
nothing has written since `RD-VRC-7`'s decision to remove it (owned by [#1499], not yet
done). Root cause: `UC-DRC` `E10` - `K3`'s fuzzy match (200 m, 0.82 name score) can miss
a rename or a nearby branch, so detection creates a Candidate for a place that already
has a verified Restaurant.

## Goal

An Operator who recognizes a pending Candidate as a place that already has a verified
Restaurant can point it there directly: the Candidate's evidence Bites gain
`bite.restaurantId` on the existing Restaurant, exactly as ordinary verification's `V23`
does, and the Candidate itself is left `status: 'verified'` with `verifiedRestaurantId`
naming that Restaurant - reusing the same audit fields ordinary verification writes
(`verifiedByUserId`, `verifiedAt`, `verifiedAtTimestamp`) rather than a separate status
or its own trail (`RD-VRC-7`). No second Restaurant and no second Menu are ever created.

## Actors

- **BiteTribe Operator** - the only actor, same surface as `UC-VRC` `V4`.

## Flow

- Reached at `UC-VRC` `V4`, recognizing a listed Candidate as a place that already has a
  verified Restaurant.
- The surface offers a hint, computed on demand with the same matching kernel `UC-DRC`
  `K1` to `K3` already runs (200 m radius, 0.82 name score) against `/restaurants`:
  "potential verified restaurant found." Nothing merges automatically - clicking it
  shows the matched restaurant(s) as a pickable list, alongside plain manual
  search/filter for when nothing was suggested or the match is wrong.
- The Operator picks the existing Restaurant, based on the suggested match(es) and/or
  the manual search.
- The evidence Bites that still exist and carry no Restaurant gain `bite.restaurantId`
  on the picked Restaurant - the same skip-if-already-linked rule `UC-VRC` `V18`/`R-20`
  uses.
- The Candidate is left `status: 'verified'`, `verifiedRestaurantId` naming the picked
  Restaurant, plus the same audit fields ordinary verification writes. `biteIds` and
  `evidence` are otherwise untouched.
- The Candidate disappears from `UC-VRC` `V2`'s pending list, the same way a normal
  verification does.

## MVP Classification

**[Secondary]** - per `UC-VRC`'s own classification: a duplicate Restaurant is a
data-quality defect, not a blocked flow; the Operator can defer at `END-V3`. Best guess;
revisit once this page reaches L1.

## Related GitHub Scope

- Part of epic [#1630]

## Related Domains

- [Restaurant](../domain/restaurant.md)
- [Bite](../domain/bite.md)

[#1499]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1499
[#1630]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1630
