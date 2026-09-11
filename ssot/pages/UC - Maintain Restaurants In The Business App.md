# UC - Maintain Restaurants In The Business App

## Status

Supported today and still expanding.

## Goal

Business users or admins can maintain Restaurant and menu context that improves Bite discovery.

## Actors

- Restaurant owner, holding the `business` role

## Current Flow

- The business user opens the dashboard, which shows the map and one entry per
  surface: **BiteTrails** and **Restaurants**.
- The business user opens Restaurants and edits one of them.
- The business user maintains menu and Restaurant metadata.
- Both the map and the list hold **only the Restaurants assigned to the
  signed-in account** since issue \#1079. An account that holds none sees an
  empty state naming BiteTribe support, not an empty list: assignment is
  operator work in the admin app, and there is nothing the account can do here
  to change it.
- The initial Menu saves the business user the first round of typing: each distinct Bite dish name becomes one item, priced with the average of the prices users reported, in a single `Bites` category. The business user then corrects, renames, and structures it in the edit-menu page.

### How The Restaurant Page Is Laid Out

Two columns inside a centred 78 rem measure, from the Ionic `lg` breakpoint
(issue \#1572). The picture, the social links, the About text and the address
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
any width. See [[Floor Plan]] for why a drag surface is not.

Each field group keeps its own Save, unlike the admin page's single one. The
admin page creates a restaurant in one write; this one edits an existing
restaurant a field group at a time, through a service call per group.

### What A Restaurant No Longer Does Here

Creating a Restaurant is operator work. Restaurant-candidate verification, the
unmatched Bite places, and the new-restaurant form both of them open moved to
the admin app with issue \#1473 — see
[[UC - Operate BiteTribe In The Admin App]]. The business app holds only what a
restaurant does to Restaurants it already has.

That was not a tidy-up. The `business` role is held by every restaurant, so
anything behind it is something every restaurant can do, and verifying a
candidate creates a Restaurant out of other people's Bites.

And, since issue \#1079, maintaining a Restaurant it was not assigned. The edit
routes - `restaurant/:restaurantId` and its menu - carry `documentOwnerGuard` on
top of the role gate, so a Restaurant assigned to another account is refused by
direct URL rather than merely being unlinked from the list. The refusal is a
toast and a return to the account's own list; it never says who does hold the
Restaurant. See [[UC - Own And Claim Restaurants]].

## Supported Evidence

- Business `dashboard`, `bite-trails` and `restaurants`
- `restaurant/:restaurantId`
- `restaurant/:restaurantId/menu/:menuId`
- `apps/bite-tribe-business-e2e/src/tests/maintain-restaurant.spec.ts` covers the business login, the dashboard, the restaurants section, opening a Restaurant, and persisting its About text and address, plus the ownership boundary: a Restaurant assigned to another account is absent from the list, the empty state renders, and the direct URL is refused

## Related GitHub Scope

- Issue \#1079 scopes this app to the Restaurants assigned to the caller and guards the edit routes; the assignment itself is [[UC - Own And Claim Restaurants]].
- Issue \#734 includes opening hours, social links, verified/unverified restaurant handling, menu cleanup, and admin restaurant workflows.
- Issue \#778 / \#942 covers verifying restaurant candidates discovered from repeated Bite evidence into real Restaurants. That flow is Operator work in the Admin App; see [[UC - Verify Restaurant Candidate]].
- Issue \#1003 seeds the initial Menu of a verified candidate from its Bites.
- Issue \#1572 gives `restaurant/:restaurantId` the two-column layout the admin app's Create Restaurant page already had.

## Related Domains

- [[Restaurant]]
- [[Bite]]
- [[User Roles]]
