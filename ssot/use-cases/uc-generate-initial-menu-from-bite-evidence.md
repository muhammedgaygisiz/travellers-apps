# UC - Generate Initial Menu From Bite Evidence

## Status

**Level:** L0.

Implemented. Reachable only from `UC-VRC` `V19`, inside the Operator's verification
transaction - no standalone trigger, no other caller anywhere in the codebase
(`apps/bite-tribe-firebase/functions/src/functions/shared/utils/initial-menu.ts`).
Marking the resulting Menu as evidence-derived, so a Restaurant Owner can retract it, is
a separate concern owned by `UC-VRC` itself (`R-11`, `RD-VRC-11`, [#1511]), not by this
page.

## Goal

Turn a candidate's evidence Bites into a starting Menu, so verification never leaves a
Restaurant with nothing to show: one item per distinct dish name, priced at the average
of the usable prices reported for it, in a single `Bites` category - so the business
owner edits from something instead of an empty menu.

## Actors

No actor. This page is a mechanism invoked from `UC-VRC` `V19`; the Operator whose
action triggers it belongs to `UC-VRC`, not to this page.

## Flow

- Dish names are grouped using the same normalizer `UC-DRC` uses for place names, so
  "Margherita" and "margherita " become one item.
- Each group becomes one Menu item, priced at the average of that group's usable
  reported prices (a missing or non-positive price doesn't count toward the average;
  an item with no priced Bite at all defaults to 0).
- Items land in one category, sorted by how many Bites support them, then by name.
- A Bite with no usable dish name is dropped; an evidence set with nothing usable
  yields an empty category list, not an error.

## MVP Classification

**[MVP]** - `V19` sits inside `UC-VRC`'s own `[MVP]`-classified success path (`V11` to
`V25`), and this page is what that step is.

## Related Domains

- [Restaurant](../domain/restaurant.md)
- [Bite](../domain/bite.md)

[#1511]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1511
