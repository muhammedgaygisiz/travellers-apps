# UC - Find Dishes That Fit A Dietary Choice

## Status

**Level:** L1.

Next to implement, under epic [#2193]. Nothing of it exists: the only dietary trace today
is a free-text tag such as `#vegan` on a Bite, which the Restaurant's derived tags repeat
([Restaurant](../domain/restaurant.md)) and nothing filters on. `explainBite` states no
dietary property by design (`UC-IBD` `R-2`), and this page keeps it that way. The flow below
is the behaviour as the team agreed it on 20 November 2026; the thresholds it depends on are
open in `Dietary Choice Questions` in [Current State - Open Questions](../current-state/open-questions.md).

## Goal

A member who eats vegan, vegetarian, gluten-free, lactose-free, halal, kosher or by another
dietary or lifestyle choice finds the dishes and restaurants that fit it, sees who claims each
dish fits, and is never shown an ad or promoted content that conflicts with it. A restaurant
can say what fits; diners can confirm or dispute it; a restaurant's claim that diners dispute
is removed.

This page owns the dietary label vocabulary, who may claim a label and how each claim is
shown, the confirmations and disputes, the removal and restoration of a disputed label, the
member's dietary choices and the filters they drive. The ad card itself is
[UC - See Ads As A Free User](uc-see-ads-as-a-free-user.md)'s; this page owns only the
exclusion it applies.

## Actors

- **Restaurant Owner** - acts: declares dietary labels on menu items and statements for the
  whole Restaurant in the business app, is told about disputes, and asks for a removed label
  back with evidence.
- **Bite Creator** - acts: marks their own Bite with dietary labels, confirms or disputes
  labels on other Bites and on menu items, sets their own dietary choices, and filters by them.
- **BiteTribe Operator** - acts: restores a removed label or confirms its removal, and
  approves new labels from a Restaurant that lost self-declaration.
- **Table Guest** - does not act. A guest at a table reads the menu's labels and their
  sources, but sets no dietary choices and casts no vote, because both need a member account.

## Guarantees

Once the behaviour has succeeded:

| #   | Guarantee                                                                                                                    |
| --- | ---------------------------------------------------------------------------------------------------------------------------- |
| G1  | Every dietary label a reader sees names its source: the restaurant, the diners, or the creator of that Bite                  |
| G2  | A restaurant's label that reached the dispute threshold is on no surface and matches no filter until an operator restores it |
| G3  | A member with a dietary choice can filter the feed, search, map and menus by it                                              |
| G4  | No ad and no promoted content shown to a member conflicts with that member's dietary choices                                 |

## Flow

- The Restaurant Owner opens a menu item in the business app and sets its dietary labels, and
  the labels it _can be made_ to fit. They set restaurant-wide statements, such as fully
  plant-based or a dedicated gluten-free kitchen, on the Restaurant ([#2194]).
- A Bite Creator creating or editing a Bite picks dietary label chips beside the tags
  ([#2195]). A Bite linked to a menu item shows the restaurant's label for it too.
- A Bite Creator sets their dietary choices in settings, and gives consent before the first
  religious or health-related one is saved ([#2196]).
- A Bite Creator reading a Bite or a menu item confirms or disputes a label, with a reason
  ([#2197]). The counts update for every reader.
- When a restaurant's label reaches the dispute threshold, the backend removes it, locks it,
  and tells the owner ([#2198]). The dish shows that the label was removed after diner reports.
- The Restaurant Owner asks for the removed label back with evidence, and an Operator restores
  it or confirms the removal ([#2199]).
- A Bite Creator with dietary choices sees the feed, search, map and menus filtered by them,
  can limit the filter to what restaurants declared, and can switch it off ([#2200]).
- Every ad request and every piece of promoted content for that member excludes the
  categories their choices rule out ([#2201]).

## Rules And Invariants

| ID       | Normative statement                                                                                                                                                                                                                                                                                                                                                       |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **R-1**  | Dietary labels come from one fixed vocabulary, used by the restaurant, the creator, the votes, the choices and the filters alike. Each label is `lifestyle` (vegan, vegetarian, pescatarian, alcohol-free) or `high-risk` (gluten-free, lactose-free, nut-free, halal, kosher). An unknown stored value is not shown. Free-text tags are not labels and are left as typed |
| **R-2**  | No label is shown as plain fact. Each names its source, `RD-DC-1`                                                                                                                                                                                                                                                                                                         |
| **R-3**  | Only an account holding the Restaurant, or an Operator, writes the Restaurant's labels and statements. Only the Bite's creator writes the Bite's labels                                                                                                                                                                                                                   |
| **R-4**  | A high-risk label whose only sources are diners or the creator is always shown with the fixed, translated notice to confirm with the restaurant, whatever its count, `RD-DC-5`                                                                                                                                                                                            |
| **R-5**  | An account votes once per label on a target and may change its vote. The creator does not vote on their own Bite, and an account holding the Restaurant does not vote on its labels. Counts and removal state are written by the backend only                                                                                                                             |
| **R-6**  | A restaurant's label is removed automatically once eligible disputes reach the threshold within the window and outnumber confirmations. A high-risk label has a lower threshold, `RD-DC-4`                                                                                                                                                                                |
| **R-7**  | A removed label is locked: the owner cannot set it again, and only an Operator restores it. Restoring discards the disputes that removed it                                                                                                                                                                                                                               |
| **R-8**  | A Restaurant that reaches the strike limit of confirmed removals publishes no new label without Operator approval                                                                                                                                                                                                                                                         |
| **R-9**  | A member's dietary choices are only what the member sets. They are never inferred, never readable by another account, never an analytics attribute, and never sent to an ad network as an attribute of the member, `RD-DC-3`                                                                                                                                              |
| **R-10** | A religious or health-related choice is not stored without the member's consent, and withdrawing consent removes it                                                                                                                                                                                                                                                       |
| **R-11** | No ad and no promoted content conflicts with the member's dietary choices, by a fixed mapping from each choice to the ad categories it excludes, `RD-DC-2`                                                                                                                                                                                                                |
| **R-12** | A removed label matches no dietary filter                                                                                                                                                                                                                                                                                                                                 |

## Authorization

The boundary as this page understands it: the Restaurant's labels are owner-scoped like
`facilities`, the Bite's labels are creator-scoped like the rest of the Bite, votes go
through a callable that checks eligibility, every count and the removal state are
backend-only, and restoration is an Operator action. A member's dietary choices live in
their private settings and no other account reads them. The per-step enforcement is written
when the page reaches L2.

## MVP Classification

**[Secondary]** - the whole page. It is post-launch work under epic [#2193], and nothing here
is strictly required for the initial release.

## App Store Review Area

Relevant in two places. Dietary choices that reveal religion or health are special-category
data under GDPR Art. 9, so the privacy policy, the App Store privacy nutrition label and the
Play data-safety form are checked against
[Implementation - Store Declarations](../implementation/store-declarations.md) before [#2196] ships. The ad
exclusion of [#2201] must hold the ad declarations that epic [#1123] writes, by never sending
the choices to the ad network. A label from diners about a medical property carries the
high-risk notice so that it never reads as medical advice.

## Supported Evidence

Not implemented. The surfaces this will touch:

- `libs/bite-tribe-common/model` - `menu.ts` and the Bite and Restaurant models, for the
  vocabulary and the label fields
- `libs/bite-tribe-business` - the menu editor and the Restaurant editor
- `libs/bite-tribe/bite`, `libs/bite-tribe/menu/page`, `libs/bite-tribe/restaurant/page`,
  `libs/bite-tribe/home/page` and `libs/bite-tribe/settings`
- `apps/bite-tribe-firebase/functions` - the vote callable and the removal trigger
- `firestore.rules` and `firestore.indexes.json`

## Related GitHub Scope

- [epic-2193][#2193] is the epic.
- [#2194] declares restaurant labels and statements, and introduces the vocabulary.
- [#2195] adds creator labels to the Bite.
- [#2196] stores the member's dietary choices.
- [#2197] adds confirmations and disputes.
- [#2198] removes and locks a disputed restaurant label.
- [#2199] adds restoration by an Operator.
- [#2200] adds the filters.
- [#2201] applies the ad and promoted-content exclusion.
- [#401] asked for persisted default search tags such as halal, which [#2196] replaces.

## Related Domains

- [Bite](../domain/bite.md)
- [Restaurant](../domain/restaurant.md)
- [User](../domain/user.md)

## Related Pages

- [Recorded Decisions](../decisions/recorded-decisions.md) - `RD-DC-*`
- [Current State - Open Questions](../current-state/open-questions.md) - `Dietary Choice Questions`
- [UC - See Ads As A Free User](uc-see-ads-as-a-free-user.md) - the ad card this page's exclusion applies to
- [UC - View Restaurant Menus](uc-view-restaurant-menus.md) - the menu the labels are shown on
- [UC - Maintain Restaurants In The Business App](uc-maintain-restaurants-in-the-business-app.md) - where an owner declares them
- [UC - Inspect Bite Details](uc-inspect-bite-details.md) - `Explain me`, which makes no dietary claim
- [UC - Configure Personal Settings](uc-configure-personal-settings.md) - where the dietary choices are set

[#401]: https://github.com/muhammedgaygisiz/travellers-apps/issues/401
[#1123]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1123
[#2193]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2193
[#2194]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2194
[#2195]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2195
[#2196]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2196
[#2197]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2197
[#2198]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2198
[#2199]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2199
[#2200]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2200
[#2201]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2201
