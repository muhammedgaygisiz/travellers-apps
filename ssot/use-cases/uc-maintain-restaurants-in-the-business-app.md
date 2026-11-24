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
- For each Restaurant the account holds, the dashboard shows how it is doing (issue
  [#2133]): its Bites, their average rating with how many ratings it comes from ("No
  ratings yet" without one), and its followers. The Bites are the ones the consumer
  restaurant page shows when opened without a Bite ([#2320]): those near the Restaurant's
  own position that the shared rule in `utils` (`closeTo`, `matchRestaurantBites`,
  `averageRatingOf`) matches to it, so the owner reads the numbers a guest sees. The
  followers are the Restaurant's backend-kept `followersCount` ([#2132]). The figures are
  computed in the business app, because the consumer app already shows them to every
  member; there is no owner-only read. A Restaurant without a position, or whose nearby
  read fails, gets no figures card rather than zeros. There is no trend over time.
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
  with it. "Menu reviewed" is ticked by the owner's first menu save, or by
  confirming a menu built from Bites with "This is our menu", because a menu
  built from Bite evidence is a draft only the owner can correct; an
  operator's save from the admin app does not count. Its label names the menu
  the Restaurant has (issue [#2302]): "Create your menu" without one, "Check
  the menu we built from guests' Bites" for a menu still marked as built from
  Bites, and "Review your menu" for the owner's own. Only the menu records
  where it came from, so the overview and the dashboard read it for the label;
  every item's tick still comes from the stored Restaurant.
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
  spinner, and `setRestaurantImagePathOnUpload` publishes it even if the page
  is gone. An error, or 30 s with no progress, ends in
  `failed` and the shared retry button; an upload from an earlier session asks
  for the photo again, because the web app keeps no copy on the device.
- The photo is published only once the image check passed it (issue
  [#2141]). The page writes no download URL; once the transfer is done the box
  says the photo is being checked, and the page listens for the verdict. A
  refused photo is deleted, the Restaurant keeps the photo it had, and the
  page says why below the box, where a different photo can be chosen at once;
  the refused one is never sent again.
- A photo whose check could not run stays `pending`, and the box keeps saying
  it is being checked, while the backend checks it again over about sixteen
  hours (issue [#2142]). It ends published or refused as above, or, when the
  last attempt still cannot answer, `failed` with the shared retry.
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
- The Restaurant Owner declares what fits a diet (issue [#2194]). In the dish editor, a dish and each of its variants get the labels they fit as served and the labels the kitchen can make them fit on request, saved with the dish. In the restaurant's `Dietary` section they pick statements about the whole kitchen and write a cross-contamination note, saved together by the `saveRestaurantDietaryStatements` callable, which refuses a note that fails the content check and writes nothing. Like every other section, its Save is offered only once a statement or the note differs from what is stored (issue [#2275]), and a save runs under the saving overlay and returns to the overview (issue [#2276]); a refused note keeps the owner on the section with the content-check message. Empty removes each field. The vocabulary is [UC - Find Dishes That Fit A Dietary Choice](uc-find-dishes-that-fit-a-dietary-choice.md)'s; the rule is the Restaurant's, in [Restaurant](../domain/restaurant.md).
- The initial Menu saves the Restaurant Owner the first round of typing: each distinct Bite dish name becomes one item, priced with the average of the prices users reported, in a single `Dishes` category. The Restaurant Owner then corrects, renames, and structures it in the edit-menu page.
- The edit-menu page is the menu as a list, and one editor at a time (issue [#2182]). Each category is a heading with its subtitle and an edit button; each dish is one line with its description, its price and an availability switch; each variant is a line of its own under its dish, with its own name, its own price and its own switch; a category's extras are one line under its dishes. Nothing in the list is a form. A dish or a category opens its own editor - beside the list on a wide screen, in its place on a phone - with labelled fields and one Save and one Cancel: a dish's name, description, price or variants, and its ingredients and notes folded under "More details"; a category's title and subtitle, with its extras below. A category's extras are part of its editor (issue [#2258]): adding, editing, removing or moving one changes nothing stored until the category's Save, which writes them with the title, Cancel throws them away, and Save is offered as soon as they differ from what is stored. Every price field - a dish's, a variant's, an extra's - shows the price with the currency's decimals and a point, "11.50", and reads "11,50" and "11.50" alike (issue [#2279]). The category's Delete, Cancel and Save sit below its extras, so the Save that writes them is the last thing in the editor (issue [#2278]). Each variant is one bordered card holding its name, price, dietary fields and buttons, with the buttons on the name's line (issue [#2281]). An empty name or title cannot be saved, and every price must be above zero. A saved dish and a saved category each carry a Delete in their editor, behind a confirmation that says what goes with it - a dish's variants, a category's dishes, their variants and its extras, and for a category with neither dishes nor extras that it is empty (issue [#2260]) - and the delete is saved like any other change (issue [#2181]); a variant is removed with its row's remove button and the removal is written by the dish's Save. Variants, a category's extras, a dish's options and the choices within an option (issue [#2277]) are put in order with up and down buttons on each row, which work by keyboard and at phone width (issue [#2256]): a variant's move is written by the dish's Save and an extra's by the category's, and guests read both in that order on every menu and when ordering. Orders already sent keep a deleted dish, because each order line carries its own copy of the dish's name and price. Availability is switched from the list, for a dish and for each variant, because it is the one change an owner makes during service. A save made outside an open editor - the currency, a switch or a reorder in the list - reads the menu back without touching the editor's unsaved changes (issue [#2259]): the editor keeps what the owner typed, Save stays on offer, and only the fields the owner has not touched take the stored value, so the editor's Save does not undo the switch. Every change is saved by the owner, never by a pause in typing (issue [#1377]): it writes the whole menu under a loading overlay, a toast reports the outcome, and the editor closes once the saved menu has been read back - so a refused save leaves the edit in the editor for another try. Every price shows the menu's currency, so a price is never read as a time. The currency is one row at the top that opens a list searchable by code, symbol or name, in code order (issue [#2255]); choosing one saves it, and "Not set" removes it. A menu with no currency is offered the currency of the restaurant's own country - its position on the map, looked up offline through the time zone it lies in - with a note that says so, names the device's currency when it differs, and a one-tap "Use EUR". Only without a position is the device's currency offered, and the note says that too: a chain or an agency sets menus up from somewhere else. A menu that verification built from guests' Bites (`derivedFromBites`) shows a notice above the list that says so and a "This is our menu" button; confirming it, behind a dialog that says it covers every dish and price and cannot be undone, removes the mark, and the consumer menu stops telling guests the prices are averages (issue [#2214]). Saving the menu or its currency never removes it.
- Guest Bites (issue [#2216]), opened from the restaurant overview's "Guest Bites" button, which counts the Bites still waiting, lists the guests' Bites about the Restaurant that are linked to no dish and not dismissed, newest first. Each shows its photo, dish name, rating and date, and the dish whose name matches it when one does (`dishNameKey`: case, accents and punctuation do not count). The owner links it to that dish, chooses another dish (and a variant, or "Not sure") from a sheet listing the menu by category, or marks it "Not on the menu" after a confirmation. A linked or dismissed Bite leaves the list, with a toast that says what happened ("Linked to Rösti", "Marked as not on the menu"); a dismissed one cannot be brought back here. A refused write says why, from the callable's code (issue [#2262]): a Bite the guest linked meanwhile, or one that was deleted, says so and leaves the list, because no retry can succeed; a dish that left the menu meanwhile says so and the Bite stays for another dish; a restaurant no longer assigned to the account says so; only a network or unknown failure keeps the generic "try again". A Bite the guest linked themself, from an order or a dish's Create Bite button, never appears. Every write goes through the `linkBiteToMenuItem` callable, which checks the Restaurant, the dish and the guest's own link; the Bite rules are unchanged. A linked Bite counts toward its dish's stats and shows under the dish on the consumer menu, and guests see nothing that says who linked it.
- An option is a choice on a dish that doesn't change its price, such as how spicy it should be (issue [#2254]). A dish's editor has an "Options" section below Variants: each option has a name ("Zubereitungsart"), two or more named choices ("nicht scharf", "scharf"), and a "Guests must choose" switch, which is on for a new option. An option without a name, a choice without a name, or an option with fewer than two choices cannot be saved. Options belong to the dish, so they apply to whichever variant is ordered, and the list shows each one on a line under the dish ("Zubereitungsart: nicht scharf · scharf"). A choice that costs something stays a variant or an extra. Guests read an option under the dish and answer it when they order at a table; see [UC - Order At The Table Through A QR Code](uc-order-at-the-table-through-a-qr-code.md).
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
checklist still counts, and a last row for the menu, which says whether there is
one and whether it has been checked, and opens the menu editor or creates the
menu. While anything is missing, the setup progress sits at the top with the
next item to do. Only the rows the checklist counts carry a status, a tick or
an open circle, so the ticks always add up to the progress's "N of M done";
the position and ordering at the table show none (issue [#2221]). Below the rows are the ways _out_: the menu
(edit, or create when there is none), the menu code, the staff, the floor plan
and the live tables.

Ordering at the table is "Coming soon" where guests cannot order yet (issue
[#2307]): a guest orders through an anonymous session, and anonymous sign-in is
not enabled in production. Its overview row says "Coming soon" and does not
open, its section shows "Coming soon" instead of the switch (which also covers
a link straight to it), and the floor plan's "Print QR codes" is disabled with
"Coming soon" beside it, so no table code goes out that every guest would fail
to scan. The floor plan, the tables and the staff stay, so owners see what is
coming and can set it up. It is offered where
`NX_APP_BITE_TRIBE_TABLE_ORDERING_ENABLED` is `true` (QA, through
`qa.web.json`) or the build targets the emulators (`NX_APP_BITE_TRIBE_IS_DEV`);
unset, as in production, it is not.

Each row opens `restaurant/:restaurantId/edit/:section`, which holds only that
section's fields and its one Save. While a save runs, the section is covered by the same "Saving…" overlay as the menu editor's save, so Save cannot be pressed twice (issue [#2225]). The position section says how the pin moves (a tap places it, nothing changes until Save) and opens at street level on the stored position, or on the device's position for a Restaurant that has none (`0, 0` counts as none), before the world view (issue [#2226]). Save stays disabled while the fields still
hold what is stored, as in the menu editor, and enables again only when they
differ (issue [#2222]); the order of the chosen categories does not count, and
the time zone pre-filled for a restaurant that never set one is not a change. That pre-filled zone is the one the Restaurant's own position lies in, looked up offline (`@photostructure/tz-lookup`), and the device's only for a Restaurant without a position; a note under the picker names where it came from, and the device's zone when the two differ, before anything is saved. The picker opens a searchable list, by any part of the zone's name (issue [#2228]). A successful save returns to the overview,
which reads the Restaurant again and shows the new value; a failed save stays on
the section with the edit kept, so it can be tried again. Every section
confirms itself the same way (issue [#2263]): "<its label on the page> saved",
and a refused save names the section and says the changes are still there,
"Opening hours weren't saved. Your changes are still here; try again." The photo is the
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
- `restaurant/:restaurantId/menu/:menuId/guest-bites`
- `apps/bite-tribe-business-e2e/src/tests/guest-bites.spec.ts` covers Guest Bites: the overview's count leaves out a Bite the guest linked; a Bite whose name matches a dish is linked and stored as the owner's link; another is marked not on the menu after the confirmation and the list ends empty; the guest's own link is untouched
- `apps/bite-tribe-business-e2e/src/tests/maintain-restaurant.spec.ts` covers the business login, the dashboard, the restaurants section, opening a Restaurant, and persisting its About text and address, stating the gender-neutral restroom across a reload and taking the answer back as a removed field, plus the ownership boundary: a Restaurant assigned to another account is absent from the list, the empty state renders, and the direct URL is refused
- `apps/bite-tribe-business-e2e/src/tests/edit-menu.spec.ts` covers the edit-menu page: a category title stays unsaved through a pause in typing, cannot be saved empty, and persists on Save, which keeps the owner on the page with a toast and closes the editor; an older dish opens with its own price as an unnamed first variant and its variant named by its description, and saves in the new shape once named; a zero or empty price cannot be saved; a variant switched off from the list is stored; and a dish deleted after the confirmation stays deleted after a reload, and a deleted category takes its dishes with it; and a menu built from Bites keeps its mark through a save and loses it, with its categories and currency intact, only when the owner confirms it

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
- Issue [#2194] added the dietary pickers to the dish editor and the restaurant's `Dietary` section. Part of epic [#2193].
- Issue [#2183] split the page into an overview and one view per section, and pointed every checklist item at its own section. Part of epic [#2123].
- Issue [#2141] publishes the photo only once the image check passed it, and shows a refusal with its reason. Part of epic [#2137].
- Issue [#2142] checks again a photo whose check could not run. Part of epic [#2137].
- Issue [#1653] keeps every field on this page, the menu code included, rendered when the
  device reports no GPS position; the restaurant is read without a `distance` instead of
  being withheld.
- Issue [#1377] moved the edit-menu page onto the public Signal Forms API and replaced the
  title and name autosave with an explicit Save, fixing an item rename that was never stored. A menu
  save no longer leaves the editor; it reports itself with a loading overlay and a toast.
- Issue [#2254] adds options, choices on a dish that don't change its price. Part of epic [#2123].
- Issue [#2182] made the edit-menu page a list with one editor per dish and per category, gave variants names of their own, and put availability switches in the list. Part of epic [#2123].
- Issue [#2181] added deleting a dish and a category, each behind a confirmation. Part of epic [#2123].
- Issue [#2214] added the owner's confirmation that a menu built from Bites is their own. Part of epic [#2123].
- Issue [#2216] added Guest Bites, where the owner links guests' Bites to the dishes they are about. Part of epic [#2123].
- Issue [#2221] made the overview's ticks agree with the setup progress: the menu got a row, and the rows the checklist does not count lost their tick. Part of epic [#2123].
- Issue [#2222] disabled every section's Save until something changed, and made the Kind of place toast read "Kind of place saved". Part of epic [#2123].
- Issue [#2223] stacked the address and link labels above their fields, as in the menu editor, and left the About field to its section heading. Part of epic [#2123].
- Issue [#2224] added removing a link, left a blank link row out of the save instead of letting it block one, put the links' text in Transloco, and replaced Twitter with X and added TikTok in the network list. Part of epic [#2123].
- Issue [#2225] put every section save under a "Saving…" overlay and ignored a second press while one runs. Part of epic [#2123].
- Issue [#2226] opened the position map at street level instead of the world, said how to move the pin, and opened a Restaurant without a position on the device's position. The fix is in the shared map, so the consumer app's Bite position picker opens the same way. Part of epic [#2123].
- Issue [#2227] made an open day need its times: the editor asks for them and will not save without, and the overview counts only the days guests are shown as open. Part of epic [#2123].
- Issue [#2228] offered a Restaurant its own position's time zone instead of the device's, said which before saving, and made the zone picker searchable. Part of epic [#2123].
- Issue [#2229] dropped the menu code card's own heading, which repeated the section's title. Part of epic [#2123].
- Issue [#2230] fixed printing the menu code, which came out as one blank page once the code moved into its own section view ([#2183]), and added print-media Loki stories for it and the table sticker sheet so a blank printout fails the visual suite. Part of epic [#2123].
- Issue [#2231] loaded the Restaurant on the menu editor and Guest Bites when they are opened by URL, so a reload or a shared link keeps the Restaurant's name above the menu. Part of epic [#2123].
- Issue [#2133] added each held Restaurant's Bites, rating and followers to the dashboard. Part of epic [#2123].
- Issue [#2232] sent a staff account refused by an owner route back to its own tables, told the page is the owner's, instead of to the owner's empty restaurant list. Part of epic [#2123].
- Issue [#2233] made the shared header show the whole logo and app name at phone width: the title's button reserve fits the buttons, and a long name is sized to the space it has. Part of epic [#2123].
- Issue [#2234] laid the opening hours out as a list at phone width, one line per day and its ranges under it, so both times and the remove button are on screen; phone-width stories guard it. Part of epic [#2123].
- Issue [#2256] added moving a variant and an extra up and down. Part of epic [#2123].
- Run 3 of the launch test [#1957] found seven small gaps, fixed together: the Dietary Save on an untouched form ([#2275]) and its save flow ([#2276]), reordering options and choices ([#2277]), the category editor's Save above its extras ([#2278]), two price formats in the editor ([#2279]), empty categories shown to guests ([#2280]) and ungrouped variant controls ([#2281]). Part of epic [#2123].
- Issue [#2258] made a category's extras save with the category's Save, and Cancel discard them, instead of each edit saving itself when its field was left. Part of epic [#2123].
- Issue [#2259] kept an open dish or category editor's unsaved changes when a currency change, a switch or a reorder reads the menu back. Part of epic [#2123].
- Issue [#2260] made deleting an empty category say it is empty, instead of naming extras it does not have. Part of epic [#2123].
- Issue [#2262] made a refused Guest Bites link say why, and drop a Bite no retry can link. Part of epic [#2123].
- Issue [#2263] gave every restaurant section's save toast one pattern, named the section in a refused save, and made Guest Bites say what it linked or dismissed. Part of epic [#2123].

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
[#2181]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2181
[#2182]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2182
[#2255]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2255
[#2254]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2254
[#2141]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2141
[#2142]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2142
[#2137]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2137
[#2193]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2193
[#2194]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2194
[#2214]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2214
[#2216]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2216
[#2221]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2221
[#2222]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2222
[#2223]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2223
[#2224]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2224
[#2225]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2225
[#2226]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2226
[#2227]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2227
[#2228]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2228
[#2229]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2229
[#2230]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2230
[#2231]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2231
[#2232]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2232
[#2233]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2233
[#2234]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2234
[#2260]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2260
[#2262]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2262
[#2263]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2263
[#2256]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2256
[#2258]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2258
[#2259]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2259
[#2275]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2275
[#2276]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2276
[#2277]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2277
[#2278]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2278
[#2279]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2279
[#2280]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2280
[#2281]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2281
[#2302]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2302
[#1957]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1957
[#2307]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2307
[#2133]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2133
[#2320]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2320
[#2132]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2132
