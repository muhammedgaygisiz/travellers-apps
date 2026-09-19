# UC - Maintain Restaurants In The Business App

## Status

**Level:** L1

Supported today. A business account signs in, sees the map and the two surfaces the dashboard
offers, and edits the Restaurants assigned to it - metadata, opening hours, social links,
address, and the menu seeded from its Bites. It sees only what it owns, and the edit routes
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
- The Restaurant Owner opens Restaurants and edits one of them.
- The Restaurant Owner maintains menu and Restaurant metadata.
- Both the map and the list hold **only the Restaurants assigned to the
  signed-in account** since issue [#1079]. An account that holds none sees an
  empty state naming BiteTribe support, not an empty list: assignment is
  operator work in the admin app, and there is nothing the account can do here
  to change it.
- The Restaurant Owner publishes the menu, by taking the code on the restaurant's page (issue [#370]). It is a QR code and the same address as plain text, because publishing a menu should not require owning a printer - the text goes on a Google listing, an Instagram bio or the restaurant's own site, and the code goes in a window, on a menu card or on a table tent. A restaurant with no menu is shown what is missing instead of a code: one for a restaurant with no menu tells whoever scans it that there is nothing to read. What the reader then sees is [UC - View Restaurant Menus](uc-view-restaurant-menus.md); which restaurants may publish at all is `RD-PM-5`.
- The initial Menu saves the Restaurant Owner the first round of typing: each distinct Bite dish name becomes one item, priced with the average of the prices users reported, in a single `Bites` category. The Restaurant Owner then corrects, renames, and structures it in the edit-menu page.

This page owns producing the code and not what it leads to, which is the split
`RD-PM-1` draws: the code is made here because a restaurant that wants nothing
from BiteTribe but a menu in its window should need no floor plan and no tables,
and the floor-plan editor's printable table sheets are a different printed thing
(`RD-PM-4`).

### How The Restaurant Page Is Laid Out

Two columns inside a centred 78 rem measure, from the Ionic `lg` breakpoint
(issue [#1572]). The picture, the social links, the About text and the address
run down the left; the map and the opening hours run down the right; and the
ways _out_ of the page - the menu, the staff, the floor plan - sit in a row
under both.

It is the shape the admin app's Create Restaurant page already had. The two
surfaces edit substantially the same fields, and before this the business one
inherited `PageComponent`'s default 720 px cap and rendered on a laptop as a
phone screen stretched to roughly two thousand pixels: the owner scrolled past
the whole form to reach the buttons. The map and the week are what went right,
because they are the two blocks that want width and height rather than a label
and a field - and because the opening-hours table is the tallest thing on the
page, so beside the map it balances the columns instead of lengthening them.

The columns stack below the breakpoint, in the order they are written. That is
the opposite of what the floor-plan editor does in the same app, and
deliberately: this page is a form, and a labelled input is a labelled input at
any width. See [Floor Plan](../domain/floor-plan.md) for why a drag surface is not.

Each field group keeps its own Save, unlike the admin page's single one. The
admin page creates a restaurant in one write; this one edits an existing
restaurant a field group at a time, through a service call per group.

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
routes - `restaurant/:restaurantId` and its menu - carry `documentOwnerGuard` on
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
- `restaurant/:restaurantId`
- `restaurant/:restaurantId/menu/:menuId`
- `apps/bite-tribe-business-e2e/src/tests/maintain-restaurant.spec.ts` covers the business login, the dashboard, the restaurants section, opening a Restaurant, and persisting its About text and address, plus the ownership boundary: a Restaurant assigned to another account is absent from the list, the empty state renders, and the direct URL is refused

## Related GitHub Scope

- Issue [#1079] scoped this app to the Restaurants assigned to the caller and guarded the edit
  routes. Closed as completed; the assignment itself is [UC - Own And Claim Restaurants](uc-own-and-claim-restaurants.md).
- Issue [#734], the restaurant and menu epic, covered opening hours, social links,
  verified/unverified restaurant handling, menu cleanup, and admin restaurant workflows.
  Closed as completed - delivered, not planned.
- Issue [#778], the candidate epic, and issue [#942] covered verifying restaurant candidates
  discovered from repeated Bite evidence into real Restaurants. Both closed as completed. That
  flow is Operator work in the Admin App; see [UC - Verify Restaurant Candidate](uc-verify-restaurant-candidate.md).
- Issue [#1003] seeded the initial Menu of a verified candidate from its Bites. Closed as
  completed.
- Issue [#1572] gave `restaurant/:restaurantId` the two-column layout the admin app's Create
  Restaurant page already had. Closed as completed.
- Issue [#370] put the published menu code on `restaurant/:restaurantId`, and with it the
  copyable address and the print sheet. Closed as completed, delivering issue [#371].
- Issue [#1653] blanks every field on this page, the menu code included, whenever the device
  reports no GPS position. Open.

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
