# UC - Maintain Restaurants In The Business App

## Status

**Level:** L1

Supported today. A business account signs in, sees the map and the two surfaces the dashboard
offers, and edits the Restaurants assigned to it - metadata, opening hours, social links,
address, facilities, and the menu seeded from its Bites. It sees only what it owns, and the edit routes
refuse anything else by direct URL. Creating a Restaurant is not done here; that moved to the admin app with issue [#1473].

## Goal

Restaurant Owners can maintain Restaurant and menu context that improves Bite discovery.

This page owns what an account may do to a Restaurant it already holds, including taking a
dish off today's menu - `MenuItem.isAvailable` is written here and nowhere else. How a menu, an unavailable dish included, then reads to a diner is
[UC - View Restaurant Menus](uc-view-restaurant-menus.md). Being given a Restaurant is
[UC - Own And Claim Restaurants](uc-own-and-claim-restaurants.md), and creating one, by verifying a candidate into it,
is [UC - Verify Restaurant Candidate](uc-verify-restaurant-candidate.md).

## Actors

- **Restaurant Owner** - acts: opens the dashboard, edits the Restaurants assigned to its
  account, and maintains their metadata and menus. It holds the `business` role.

## Flow

- The Restaurant Owner opens the dashboard, which shows the map and one entry per
  surface: **BiteTrails** and **Restaurants**.
- An account that holds no Restaurant yet - the `business` role and the
  assignment are two separate operator steps - sees on the dashboard what
  happens next: BiteTribe assigns the Restaurant, it appears here without
  signing out, with "Email BiteTribe support" and "Check again" (issue
  [#2127]). The dashboard re-reads on entry and whenever the tab becomes
  visible again, so an assignment made while the owner is on the phone with
  the operator shows up when they come back. The state waits for the read to
  resolve, and a failed read is not shown as "no restaurant". A staff account
  with no restaurant record falls through `staffEntryGuard` to the same page
  and the same state.
- While a Restaurant the account holds still lacks something guests see, the
  dashboard shows it a checklist (issue [#2126]): photo, category (issue
  [#2131]), address, opening hours, description, a link, facilities, and
  "menu reviewed". Each item opens
  the screen that completes it - the menu editor for the menu, the section of
  the Restaurant that holds the field for the rest (issue [#2183]), or the
  overview to create a menu when there is none. Every
  item is read from the stored Restaurant, never a local flag, so all owners
  see the same state on every device; the dashboard re-reads the Restaurants
  each time it is shown, so returning from an edit shows it ticked. A
  Restaurant whose every item is ticked drops out, and the checklist goes
  with it. "Menu reviewed" is ticked by the owner's first menu save, because
  a menu built from Bite evidence is a draft only the owner can correct; an
  operator's save from the admin app does not count.
- The Restaurant Owner sets the Restaurant's photo in its photo section (issue
  [#2126]). The business app could not before: a photo came from candidate
  verification or not at all. The photo is one box, the way Create Bite's is: the shared
  image-upload shows the current photo with its edit and delete overlay, and
  the upload box only once the photo is deleted; Cancel brings it back. A
  Restaurant with no photo shows the upload box alone - never the consumer
  app's "not verified" placeholder, because every Restaurant on this page is
  verified and held by the account. It uploads the way a Bite or profile photo does:
  Save marks the Restaurant `imageStatus: pending` and sends the photo in the
  background, the old photo stays on show with the new one blurred under a
  spinner, and `setRestaurantImagePathOnUpload` points the Restaurant at it
  even if the page is gone. An error, or 30 s with no progress, ends in
  `failed` and the shared retry button; an upload from an earlier session asks
  for the photo again, because the web app keeps no copy on the device.
- The Restaurant Owner opens Restaurants and edits one of them.
- The Restaurant Owner maintains menu and Restaurant metadata.
- Both the map and the list hold **only the Restaurants assigned to the
  signed-in account** since issue [#1079]. An account that holds none sees an
  empty state naming BiteTribe support, not an empty list: assignment is
  operator work in the admin app, and there is nothing the account can do here
  to change it.
- The Restaurant Owner publishes the menu, by taking the code on the restaurant's page (issue [#370]). It is a QR code and the same address as plain text, because publishing a menu should not require owning a printer - the text goes on a Google listing, an Instagram bio or the restaurant's own site, and the code goes in a window, on a menu card or on a table tent. A restaurant with no menu is shown what is missing instead of a code: one for a restaurant with no menu tells whoever scans it that there is nothing to read. What the reader then sees is [UC - View Restaurant Menus](uc-view-restaurant-menus.md); which restaurants may publish at all is `RD-PM-5`.
- The Restaurant Owner states the Restaurant's facilities (issue [#1830]). Today that is one: whether it has a gender-neutral restroom, answered `Yes`, `No` or `Not stated`. `Not stated` removes the field rather than writing no, because the consumer page shows nothing for a Restaurant that has not said and would otherwise tell a guest "no" on the owner's behalf. Only the account holding the Restaurant states it; the rule is the Restaurant's, in [Restaurant](../domain/restaurant.md).
- The Restaurant Owner states what kind of venue the Restaurant is (issue [#2131]): one or two categories from a fixed list, picked under the description and saved with their own Save. Choosing a third is refused and Save is disabled until one is removed. Choosing none removes the field, so the consumer page shows nothing rather than an empty answer. The list and the rule are in [Restaurant](../domain/restaurant.md).
- The initial Menu saves the Restaurant Owner the first round of typing: each distinct Bite dish name becomes one item, priced with the average of the prices users reported, in a single `Bites` category. The Restaurant Owner then corrects, renames, and structures it in the edit-menu page.
- The edit-menu page is the menu as a list, and one editor at a time (issue [#2182]). Each category is a heading with its subtitle and an edit button; each dish is one line with its description, its price and an availability switch; each variant is a line of its own under its dish, with its own name, its own price and its own switch; a category's extras are one line under its dishes. Nothing in the list is a form. A dish or a category opens its own editor - beside the list on a wide screen, in its place on a phone - with labelled fields and one Save and one Cancel: a dish's name, description, price or variants, and its ingredients and notes folded under "More details"; a category's title and subtitle, with its extras below. An empty name or title cannot be saved, and every price must be above zero. Availability is switched from the list, for a dish and for each variant, because it is the one change an owner makes during service. Every change is saved by the owner, never by a pause in typing (issue [#1377]): it writes the whole menu under a loading overlay, a toast reports the outcome, and the editor closes once the saved menu has been read back - so a refused save leaves the edit in the editor for another try. Every price shows the menu's currency, so a price is never read as a time.
- A variant is any version of a dish with its own price - Pad Thai vegetarian or with chicken, a pizza regular or large - and it has a name of its own (issue [#2182]). A dish with variants has no price of its own, and guests order one of its variants. A dish written before that, whose variants repeated its name and carried their difference in their description, opens in the editor with each variant named by its description, and with its own price as a first variant the owner names before saving; saving writes the new shape. Until then guests see it as they always did.

This page owns producing the code and not what it leads to, which is the split
`RD-PM-1` draws: the code is made here because a restaurant that wants nothing
from BiteTribe but a menu in its window should need no floor plan and no tables,
and the floor-plan editor's printable table sheets are a different printed thing
(`RD-PM-4`).

### How The Restaurant Page Is Laid Out

An overview, and one section at a time (issue [#2183]). `restaurant/:restaurantId`
lists the Restaurant's sections - photo, kind of place, About, links, address,
position on the map, opening hours, facilities, ordering at the table - one row
each, showing what the section holds now or "Not set yet" for one the setup
checklist still counts. While anything is missing, the setup progress sits at
the top with the next item to do. Below the rows are the ways _out_: the menu
(edit, or create when there is none), the menu code, the staff, the floor plan
and the live tables.

Each row opens `restaurant/:restaurantId/edit/:section`, which holds only that
section's fields and its one Save. A successful save returns to the overview,
which reads the Restaurant again and shows the new value; a failed save stays on
the section with the edit kept, so it can be tried again. The photo is the
exception that stays: its upload reports its own progress in place. Every item
of the dashboard's setup checklist opens its own section directly.

It replaced every form on one page (issue [#1572]'s two columns), which a
checklist item opened at the top, leaving the owner to find the field the item
meant.

### What A Restaurant No Longer Does Here

Creating a Restaurant is operator work. Restaurant-candidate verification, the
unmatched Bite places, and the new-restaurant form both of them open moved to
the admin app with issue [#1473] — see
[UC - Operate BiteTribe In The Admin App](uc-operate-bitetribe-in-the-admin-app.md). The business app holds only what a
restaurant does to Restaurants it already has.

That was not a tidy-up. The `business` role is held by every restaurant, so
anything behind it is something every restaurant can do, and verifying a
candidate creates a Restaurant out of other people's Bites.

And, since issue [#1079], maintaining a Restaurant it was not assigned. The edit
routes - `restaurant/:restaurantId`, its sections and its menu - carry `documentOwnerGuard` on
top of the role gate, so a Restaurant assigned to another account is refused by
direct URL rather than merely being unlinked from the list. The refusal is a
toast and a return to the account's own list; it never says who does hold the
Restaurant. See [UC - Own And Claim Restaurants](uc-own-and-claim-restaurants.md).

## MVP Classification

**[Secondary]** - the whole page. The business app is out of scope for this release candidate
by decision and gets its own soft launch, so nothing here is required for the initial release;
[Current State - Release Candidate Test Charter](../current-state/release-candidate-test-charter.md) records that.

## App Store Review Area

Not relevant, because the business app is not store-distributed. Only
`apps/bite-tribe-ios` and `apps/bite-tribe-android` carry a `capacitor.config.ts` and a native
project; this app ships on the web. It would become relevant if the business app were ever
packaged for a store, at which point its sign-in, its role gate and its data handling would
all be reviewed for the first time.

## Supported Evidence

- Business `dashboard`, `bite-trails` and `restaurants`
- `restaurant/:restaurantId`, the overview
- `restaurant/:restaurantId/edit/:section`, one section
- `restaurant/:restaurantId/menu/:menuId`
- `apps/bite-tribe-business-e2e/src/tests/maintain-restaurant.spec.ts` covers the business login, the dashboard, the restaurants section, opening a Restaurant, and persisting its About text and address, stating the gender-neutral restroom across a reload and taking the answer back as a removed field, plus the ownership boundary: a Restaurant assigned to another account is absent from the list, the empty state renders, and the direct URL is refused
- `apps/bite-tribe-business-e2e/src/tests/edit-menu.spec.ts` covers the edit-menu page: a category title stays unsaved through a pause in typing, cannot be saved empty, and persists on Save, which keeps the owner on the page with a toast and closes the editor; an older dish opens with its own price as an unnamed first variant and its variant named by its description, and saves in the new shape once named; a zero or empty price cannot be saved; and a variant switched off from the list is stored

## Related GitHub Scope

- Issue [#1079] scoped this app to the Restaurants assigned to the caller and guarded the edit
  routes. Closed as completed; the assignment itself is [UC - Own And Claim Restaurants](uc-own-and-claim-restaurants.md).
- Epic [#734], the restaurant and menu epic, covered opening hours, social links,
  verified/unverified restaurant handling, menu cleanup, and admin restaurant workflows.
  Closed as completed - delivered, not planned.
- Epic [#778], the candidate epic, and issue [#942] covered verifying restaurant candidates
  discovered from repeated Bite evidence into real Restaurants. Both closed as completed. That
  flow is Operator work in the Admin App; see [UC - Verify Restaurant Candidate](uc-verify-restaurant-candidate.md).
- Issue [#1003] seeded the initial Menu of a verified candidate from its Bites. Closed as
  completed.
- Issue [#1572] gave `restaurant/:restaurantId` the two-column layout the admin app's Create
  Restaurant page already had. Closed as completed.
- Issue [#370] put the published menu code on `restaurant/:restaurantId`, and with it the
  copyable address and the print sheet. Closed as completed, delivering issue [#371].
- Issue [#1830] added the facilities field group and its first facility, the gender-neutral
  restroom, which the consumer restaurant page shows. Part of epic [#1823].
- Issue [#2131] added the category picker and its checklist item. Part of epic [#2123].
- Issue [#2183] split the page into an overview and one view per section, and pointed every checklist item at its own section. Part of epic [#2123].
- Issue [#1653] keeps every field on this page, the menu code included, rendered when the
  device reports no GPS position; the restaurant is read without a `distance` instead of
  being withheld.
- Issue [#1377] moved the edit-menu page onto the public Signal Forms API and replaced the
  title and name autosave with an explicit Save, fixing an item rename that was never stored. A menu
  save no longer leaves the editor; it reports itself with a loading overlay and a toast.
- Issue [#2182] made the edit-menu page a list with one editor per dish and per category, gave variants names of their own, and put availability switches in the list. Part of epic [#2123].

## Related Domains

- [Restaurant](../domain/restaurant.md)
- [Bite](../domain/bite.md)

## Related Pages

- [User Roles](../product/user-roles.md) - the `business` and `staff` roles the door gate tests, and why they are
  alternatives rather than a hierarchy
- [UC - Own And Claim Restaurants](uc-own-and-claim-restaurants.md) - how an account comes to hold a Restaurant at all
- [UC - Operate BiteTribe In The Admin App](uc-operate-bitetribe-in-the-admin-app.md) - creating a Restaurant, and the migrations and
  candidate verification that left this app with issue [#1473]
- [UC - Verify Restaurant Candidate](uc-verify-restaurant-candidate.md) - the Operator flow issues [#778] and [#942] built
- [Recorded Decisions](../decisions/recorded-decisions.md) - `RD-PM-1` and `RD-PM-5` bind the menu code this page produces
- [UC - View Restaurant Menus](uc-view-restaurant-menus.md) - what the maintained menu looks like to a diner

[#734]: https://github.com/muhammedgaygisiz/travellers-apps/issues/734
[#778]: https://github.com/muhammedgaygisiz/travellers-apps/issues/778
[#942]: https://github.com/muhammedgaygisiz/travellers-apps/issues/942
[#1003]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1003
[#1079]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1079
[#1473]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1473
[#1572]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1572
[#370]: https://github.com/muhammedgaygisiz/travellers-apps/issues/370
[#371]: https://github.com/muhammedgaygisiz/travellers-apps/issues/371
[#1653]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1653
[#1823]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1823
[#1830]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1830
[#1377]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1377
[#2126]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2126
[#2131]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2131
[#2127]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2127
[#2123]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2123
[#2183]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2183
[#2182]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2182
