# UC - Find Dishes That Fit A Dietary Choice

## Status

**Level:** L1.

Partly built, under epic [#2193]. The vocabulary and the restaurant's declarations of
[#2194] exist: an owner declares labels on menu items and statements for the whole
Restaurant, and the consumer menu and restaurant page show them as declared by the
restaurant. The creator's labels on a Bite of [#2195] exist too, shown beside the
restaurant's labels for a linked dish. A member's own dietary choices of [#2196] exist, set in
settings with consent for the religious and health ones, and nothing reads them yet. Diners
confirm and dispute labels since [#2197], and a restaurant's label they dispute is removed,
locked and counted as a strike since [#2198], and an Operator restores it or confirms the
removal since [#2199]. The filters do not exist yet,
and a free-text tag such as `#vegan` on a Bite stays a tag that
nothing filters on. `explainBite` states no dietary property by design (`UC-IBD` `R-2`), and this page keeps
it that way. The flow below is the behaviour as the team agreed it on 20 November 2026; the
questions still open are `Dietary Choice Questions` in
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

| #   | Guarantee                                                                                                                                                       |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | Every dietary label a reader sees names its source: the restaurant, the diners, or the creator of that Bite                                                     |
| G2  | A restaurant's label that reached the dispute threshold is shown as a label on no surface, only as removed, and matches no filter until an operator restores it |
| G3  | A member with a dietary choice can filter the feed, search, map and menus by it                                                                                 |
| G4  | No ad and no promoted content shown to a member conflicts with that member's dietary choices                                                                    |

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
  each under its own source line, with neither replacing the other ([#2195]).
- Built: a Bite Creator sets their dietary choices in the `Dietary choices` section of
  settings, which says what they are used for. A choice is a label of the vocabulary or one of
  two avoidances without a dish label, avoiding pork and avoiding alcohol. Lifestyle choices
  are stored as soon as they are tapped. Religion and health choices - every high-risk label
  and both avoidances - are behind a consent dialog the first time, and nothing is stored if
  the member does not agree. Withdrawing the consent, from the same section, removes those
  choices and keeps the lifestyle ones; clearing removes every choice and keeps the consent.
  Each change is written at once, apart from the preferences form, and a failed write is
  announced and undone ([#2196]). Onboarding does not offer the section.
- Built: a Bite Creator reading somebody else's Bite taps the thumb up or thumb down on the
  row of one of the creator's labels, or on a restaurant's menu taps one of a dish's labels
  and chooses, and confirms or disputes it. A confirmation by thumb is sent at once. A dispute takes a
  reason from a fixed list - an animal product, gluten, the staff said it does not fit, I got
  sick, other - and an optional note, checked before it is stored (`RD-UR-11`). A second vote
  replaces the first. An ineligible account is told why. Every reader sees how many diners
  confirm and how many dispute each label - on a Bite as counts beside the thumbs, on the menu
  as how many of the voters agree with a bar of how they split - and the counts change for every open page as a
  vote lands. A creator's label with 3 confirmations and no dispute moves from what the
  creator says to what diners report, and halal and kosher do so only where the restaurant
  declares them too ([#2197], `RD-DC-6`).
- Built: when a diner's vote takes a restaurant's label to the dispute threshold, the backend
  removes it with nobody acting, keeps it as removed with its disputes, and counts it as a
  strike on the Restaurant ([#2198], `RD-DC-7`). The dish shows the label struck through as
  removed after diner reports, on the member's, the published and the ordering menu, and a
  linked Bite no longer shows it as declared by the restaurant. The owners are told by push
  at a label's first dispute and at its removal. In the business app's dish editor the
  removed label is not offered again, and a note says it was removed; a save that sends it
  anyway is told it stayed removed. Once a Restaurant has 3 strikes within 12 months, a label
  a dish does not publish yet waits for an Operator, and the save says so. The Operator
  approves or refuses each waiting label in the admin app's `Dietary label approvals`, and an
  approved one is published on the dish.
- Built: under a removed label in the dish editor, the Restaurant Owner asks BiteTribe to
  restore it, with an explanation and an optional photo of the ingredients, recipe or supplier
  change; the photo reaches the Operator only once the image check passed it. The editor then
  says the request waits for review. Every removal waits in the admin app's
  `Removed dietary labels` with its disputes - their reasons, notes and dates, never who - its
  confirmations, and the owner's explanation and photo. The Operator restores the label or
  confirms its removal, with a reason the operator log keeps, request or not ([#2199],
  `RD-DC-8`). A restored label shows again and matches filters, its disputes are discarded and
  its count starts from zero, and its strike is taken back. A confirmed removal keeps its
  strike and leaves the queue until the owner asks again. The rest of this flow is intended.
- A Bite Creator with dietary choices sees the feed, search, map and menus filtered by them,
  can limit the filter to what restaurants declared, and can switch it off ([#2200]).
- Every ad request and every piece of promoted content for that member excludes the
  categories their choices rule out ([#2201]).

## Rules And Invariants

| ID       | Normative statement                                                                                                                                                                                                                                                                                                                                                                                           |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **R-1**  | Dietary labels come from one fixed vocabulary, used by the restaurant, the creator, the votes, the choices and the filters alike. Each label is `lifestyle` (vegan, vegetarian, pescatarian, alcohol-free) or `high-risk` (gluten-free, lactose-free, nut-free, halal, kosher). An unknown stored value is not shown. Free-text tags are not labels and are left as typed                                     |
| **R-2**  | No label is shown as plain fact. Each names its source, `RD-DC-1`                                                                                                                                                                                                                                                                                                                                             |
| **R-3**  | Only an account holding the Restaurant, or an Operator, writes the Restaurant's labels and statements. Only the Bite's creator writes the Bite's labels                                                                                                                                                                                                                                                       |
| **R-4**  | A high-risk label whose only sources are diners or the creator is always shown with the fixed, translated notice to confirm with the restaurant, whatever its count, `RD-DC-5`                                                                                                                                                                                                                                |
| **R-5**  | An account votes once per label on a target and may change its vote. The creator does not vote on their own Bite, and an account holding the Restaurant does not vote on its labels or on a Bite at it. Only an account at least 14 days old with a Bite of its own votes, `RD-DC-6`. Counts and removal state are written by the backend only. Deleting an account removes its votes and corrects the counts |
| **R-6**  | A restaurant's label is removed automatically once eligible disputes reach the threshold within the window and outnumber confirmations. A high-risk label has a lower threshold, `RD-DC-4`                                                                                                                                                                                                                    |
| **R-7**  | A removed label is locked: the owner cannot set it again, and only an Operator restores it. Restoring discards the disputes that removed it                                                                                                                                                                                                                                                                   |
| **R-8**  | A Restaurant that reaches the strike limit of confirmed removals publishes no new label without Operator approval                                                                                                                                                                                                                                                                                             |
| **R-9**  | A member's dietary choices are only what the member sets. They are never inferred, never readable by another account, never an analytics attribute, and never sent to an ad network as an attribute of the member, `RD-DC-3`                                                                                                                                                                                  |
| **R-10** | A religious or health-related choice is not stored without the member's consent, and withdrawing consent removes it                                                                                                                                                                                                                                                                                           |
| **R-11** | No ad and no promoted content conflicts with the member's dietary choices, by a fixed mapping from each choice to the ad categories it excludes, `RD-DC-2`                                                                                                                                                                                                                                                    |
| **R-12** | A removed label matches no dietary filter                                                                                                                                                                                                                                                                                                                                                                     |

## Authorization

The boundary as this page understands it: a menu item's labels are kept in the menu's
`dietary` field since [#2198], which the rules refuse to every client write, the Operator's
included, because a menu's dishes sit in arrays no rule can look into. They are written only
by the `saveMenuDietaryLabels` callable, which admits an account holding the Restaurant or an
Operator, refuses a removed label and holds a new one for approval at the strike limit; by
the `removeDisputedDietaryLabels` trigger; and by the operator-only
`answerDietaryLabelApproval`. A menu last saved before [#2198] keeps its labels on its items
until the first of those writes the field; from then on the item fields are not read. The
Restaurant's `dietaryStrikes` are refused to every client like its follower count, and the
waiting labels in `dietaryLabelApprovals` are read only through the operator-only
`listDietaryLabelApprovals`. Each removal's queue item in `dietaryLabelRemovals` is written
only by the backend - the removal trigger, `requestDietaryLabelRestoration`, which admits an
account holding the Restaurant or an Operator, the evidence photo's check, and the
operator-only `answerDietaryLabelRemoval`, the only way a removed label comes back. An account
holding the Restaurant may `get` its own item, to wait for the photo's verdict; the queue, with
the disputes, is read only through the operator-only `listDietaryLabelRemovals`, and the
storage rules admit the evidence photo from a holder of that item's Restaurant. The Restaurant's
statements and note are written only by the `saveRestaurantDietaryStatements` callable,
which admits the same two and checks the note, and the rules refuse every client write of
them. The Bite's labels are creator-scoped like the rest of the Bite, and the rules
refuse a value outside the vocabulary (`hasValidDietaryLabels()`), votes go
through a callable that checks eligibility, every count and the removal state are
backend-only, and restoration is an Operator action. The votes are written only by the
`voteDietaryLabel` callable, which admits a member and checks eligibility itself: the rules
refuse every client write of `dietaryLabelTallies` and `dietaryLabelVotes`, let a member read
the counts, and let an account `get` only the vote document whose id ends in its own uid. A member's dietary choices live in
their private settings and no other account reads them: `settings/{uid}` is readable and
writable by that account alone, and `hasValidDietaryChoices()` refuses a value outside the
choices and a religion or health choice without `dietaryConsentAt` beside it, so a withdrawn
consent cannot leave one behind. The per-step enforcement is written
when the page reaches L2.

## MVP Classification

**[Secondary]** - the whole page. It is post-launch work under epic [#2193], and nothing here
is strictly required for the initial release.

## App Store Review Area

Relevant in two places. Dietary choices that reveal religion or health are special-category
data under GDPR Art. 9, so the privacy policy, the App Store privacy nutrition label and the
Play data-safety form are checked against
[Implementation - Store Declarations](../implementation/store-declarations.md) before [#2196] ships. The
privacy policy says so since [#2196]; the two store forms are console answers, and that page
records what they must say and that they are still to be given. The ad
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

Built by [#2196]:

- `libs/bite-tribe-common/model/src/lib/dietary-choice.ts` - the choices, which of them are
  religion or health, and `dietaryChoicesOf`, which drops a sensitive one without consent;
  `Settings.dietaryChoices` and `dietaryConsentAt` in `settings.ts`
- `libs/bite-tribe/settings/page` (`dietary-choices`) - the section, the consent and the
  withdrawal; `settings.component.ts` carries both fields through a preferences save, which
  replaces the document
- `libs/bite-tribe/settings/data-access` - `saveDietaryChoices`, a merge write of the two
  fields alone; no analytics call anywhere on the path (`R-9`)
- `apps/bite-tribe-firebase/firestore.rules` - `hasValidDietaryChoices()` on `settings`, kept
  in step with the model by `dietary-choices-parity.spec.ts`, and its allow and deny cases in
  `firestore-rules.emulator-spec.ts`
- `deleteOwnAccount` deletes `settings/{uid}`, and the choices with it
- `libs/bite-tribe/privacy-policy` - section `1.5 Dietary Choices`, in all fourteen languages

Built by [#2197]:

- `libs/bite-tribe-common/model/src/lib/dietary-vote.ts` - the votes, the dispute reasons,
  the scope keys, `isReportedByDiners` and `creatorLabelsBySource`
- `apps/bite-tribe-firebase/functions/src/functions/dietary/vote-dietary-label.ts` - the
  callable, its eligibility and the note check; `dietary-votes.ts` - the stored shape and the
  cascades `deleteOwnAccount` and `deleteDietaryLabelVotesOnBiteDelete` run; kept in step with
  the model by `dietary-votes-parity.spec.ts`
- `apps/bite-tribe-firebase/firestore.rules` - `dietaryLabelTallies` and `dietaryLabelVotes`,
  with their cases in `firestore-rules.emulator-spec.ts`
- `libs/bite-tribe/api/src/lib/dietary-vote-api` - the call, the live counts and the own votes
- `libs/bite-tribe/dietary-vote` - the vote prompt, the thumbs on a Bite's label rows and the
  agreement bar on the menu, shared by
  `libs/bite-tribe/details/page` (`bite-dietary`) and `libs/bite-tribe/menu/page`
  (`menu-item`)

Built by [#2198]:

- `libs/bite-tribe-common/model/src/lib/dietary-removal.ts` - the thresholds, the strike
  limit, `Menu.dietary` and `withMenuDietary`, which every menu read applies, so a removed
  label is never among a dish's labels (`R-12`); `MenuItem.removedDietaryLabels` and
  `Restaurant.dietaryStrikes`
- `apps/bite-tribe-firebase/functions/src/functions/dietary/remove-disputed-dietary-labels.ts`
  - the trigger on `dietaryLabelTallies`, which counts disputes within the window from the
    votes, one per account; `menu-dietary.ts` - the stored shape, kept in step with the model
    by `menu-dietary-parity.spec.ts`
- `save-menu-dietary-labels.ts`, `list-dietary-label-approvals.ts` and
  `answer-dietary-label-approval.ts` beside it - the only writers of the labels and the
  operator's queue
- `apps/bite-tribe-firebase/firestore.rules` - `dietary` on `menus`, `dietaryStrikes` on
  `restaurants` and `dietaryLabelApprovals`, with their cases in
  `firestore-rules.emulator-spec.ts`
- `libs/bite-tribe/api/src/lib/menu-api` - the menu write, which leaves the item labels out once the map exists, the call, and the
  overlay on both menu reads; `libs/bite-tribe/menu/data-access` sends the labels after the
  menu
- `libs/bite-tribe-business/edit-menu/page` (`dish-editor`) - the locked label and its note;
  `libs/bite-tribe/menu/page` (`menu-item`) - the removed label
- `libs/bite-tribe-admin/restaurants/page` (`dietary-label-approvals`) - the Operator's queue
- the `dietaryLabelDisputed` and `dietaryLabelRemoved` pushes in the Functions notification
  catalog, in all fourteen languages

Built by [#2199]:

- `libs/bite-tribe-common/model/src/lib/dietary-restoration.ts` - the queue item, the
  request and the decision; `MenuItem.restorationRequestedDietaryLabels`, laid over the menu
  by `withMenuDietary`
- `apps/bite-tribe-firebase/functions/src/functions/dietary/` -
  `request-dietary-label-restoration.ts`, `list-dietary-label-removals.ts`,
  `answer-dietary-label-removal.ts` and `set-dietary-evidence-image-path-on-upload.ts`; the
  removal trigger writes each queue item
- `apps/bite-tribe-firebase/firestore.rules` and `storage.rules` - `dietaryLabelRemovals` and
  its evidence folder, with their cases in the two rules emulator specs
- `libs/bite-tribe-business/edit-menu/page` (`dish-editor`) - the request form under a removed
  label; `libs/bite-tribe/menu/data-access` sends it and the photo
- `libs/bite-tribe-admin/restaurants/page` (`dietary-label-removals`) - the Operator's review

Not implemented yet, the surfaces the later stories will touch:

- `libs/bite-tribe/home/page`, and the readers of the choices
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
