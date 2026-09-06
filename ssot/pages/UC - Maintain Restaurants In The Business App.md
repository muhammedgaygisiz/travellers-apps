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
- The initial Menu saves the business user the first round of typing: each distinct Bite dish name becomes one item, priced with the average of the prices users reported, in a single `Bites` category. The business user then corrects, renames, and structures it in the edit-menu page.

### What A Restaurant No Longer Does Here

Creating a Restaurant is operator work. Restaurant-candidate verification, the
unmatched Bite places, and the new-restaurant form both of them open moved to
the admin app with issue \#1473 — see
[[UC - Operate BiteTribe In The Admin App]]. The business app holds only what a
restaurant does to Restaurants it already has.

That was not a tidy-up. The `business` role is held by every restaurant, so
anything behind it is something every restaurant can do, and verifying a
candidate creates a Restaurant out of other people's Bites.

## Supported Evidence

- Business `dashboard`, `bite-trails` and `restaurants`
- `restaurant/:restaurantId`
- `restaurant/:restaurantId/menu/:menuId`
- `apps/bite-tribe-business-e2e/src/tests/maintain-restaurant.spec.ts` covers the business login, the dashboard, the restaurants section, opening a Restaurant, and persisting its About text and address

## Related GitHub Scope

- Issue \#734 includes opening hours, social links, verified/unverified restaurant handling, menu cleanup, and admin restaurant workflows.
- Issue \#778 / \#942 covers verifying restaurant candidates discovered from repeated Bite evidence into real Restaurants.
- Issue \#1003 seeds the initial Menu of a verified candidate from its Bites.

## Related Domains

- [[Restaurant]]
- [[Bite]]
