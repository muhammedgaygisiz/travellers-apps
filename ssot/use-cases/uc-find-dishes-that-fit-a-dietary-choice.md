# UC - Find Dishes That Fit A Dietary Choice

## Status

**Level:** L1.

Partly built, under epic [#2193]. The vocabulary and the restaurant's declarations of
[#2194] exist: an owner declares labels on menu items and statements for the whole
Restaurant, and the consumer menu and restaurant page show them as declared by the
restaurant. The creator's labels on a Bite of [#2195] exist too, shown beside the
restaurant's labels for a linked dish. Nothing else in the flow exists yet - no votes, no
choices, no filters - and a free-text tag such as `#vegan` on a Bite stays a tag that
nothing filters on. `explainBite` states no dietary property by design (`UC-IBD` `R-2`), and this page keeps
it that way. The flow below is the behaviour as the team agreed it on 20 November 2026; the
thresholds it depends on are open in `Dietary Choice Questions` in
[Current State - Open Questions](../current-state/open-questions.md).

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

- Built: the Restaurant Owner opens a menu item in the business app and sets its dietary
  labels, and the labels it _can be made_ to fit, on the dish and on each variant. They set
  restaurant-wide statements, such as fully plant-based or a dedicated gluten-free kitchen,
  and a free cross-contamination note, in the restaurant's `Dietary` section, and the note is
  checked before it is published (`RD-UR-11`). Readers of the menu and of the restaurant page
  see each as declared by the restaurant ([#2194]).
- Built: a Bite Creator creating or editing a Bite picks dietary label chips, apart from
  the tags, and can clear them again; the field is optional and never blocks Post, offline
  included. The Bite's detail page shows them as what the creator says, and a Bite linked
  to a menu item also shows what the restaurant declares for that dish and its variant,
  each under its own source line, with neither replacing the other ([#2195]). The rest of
  this flow is intended.
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

The boundary as this page understands it: a menu item's labels are written with the menu,
whose rules admit only an account holding the Restaurant or an Operator. The Restaurant's
statements and note are written only by the `saveRestaurantDietaryStatements` callable,
which admits the same two and checks the note, and the rules refuse every client write of
them. The Bite's labels are creator-scoped like the rest of the Bite, and the rules
refuse a value outside the vocabulary (`hasValidDietaryLabels()`), votes go
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

Built by [#2194]:

- `libs/bite-tribe-common/model/src/lib/dietary-label.ts` - the vocabulary, each label's
  class, the restaurant statements and the read rules that drop an unknown value;
  `MenuItem.dietaryLabels` and `dietaryOptions` in `menu.ts`;
  `Restaurant.dietaryStatements` and `crossContaminationNote` in `restaurant.ts`
- `libs/bite-tribe-business/edit-menu/page` - the dish editor's pickers, for a dish and each
  variant
- `libs/bite-tribe-business/restaurant/page` - the restaurant's `dietary` section
- `apps/bite-tribe-firebase/functions/src/functions/restaurants/save-restaurant-dietary-statements.ts`
  - the callable that writes the statements and checks the note
- `apps/bite-tribe-firebase/firestore.rules` - `dietaryStatementFields()`, refused to every
  client write
- `libs/bite-tribe/menu/page` (`menu-item`) and `libs/bite-tribe/restaurant/page` - the
  labels and statements as declared by the restaurant

Built by [#2195]:

- `Bite.dietaryLabels` in `libs/bite-tribe-common/model/src/lib/bite.ts`,
  `needsConfirmWithRestaurantNotice` in `dietary-label.ts` and `linkedMenuItemDietaryOf`
  in `menu.ts`, which combines a dish's labels with its variant's
- `libs/bite-tribe/bite/page` (`dietary-labels`) - the Bite form's chips
- `libs/bite-tribe/details/data-access` - the linked dish's labels, read off the
  restaurant's current menu - and `libs/bite-tribe/details/page` (`bite-dietary`), which
  shows both sources and the notice
- `apps/bite-tribe-firebase/firestore.rules` - `hasValidDietaryLabels()` on `bites`, kept
  in step with the vocabulary by `dietary-labels-parity.spec.ts`
- `explain-bite.spec.ts` - `explainBite` is given no dietary label (`UC-IBD` `R-2`)

Not implemented yet, the surfaces the later stories will touch:

- `libs/bite-tribe/home/page` and `libs/bite-tribe/settings`
- `apps/bite-tribe-firebase/functions` - the vote callable and the removal trigger
- `firestore.indexes.json`

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
