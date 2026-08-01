# UC - Maintain Restaurants In The Business App

## Status

Supported today and still expanding.

## Goal

Business users or admins can maintain Restaurant and menu context that improves Bite discovery.

## Actors

- Restaurant owner or business maintainer
- Organisation admin

## Current Flow

- Business user opens dashboard.
- Business user creates or edits a Restaurant.
- Business user maintains menu and Restaurant metadata.
- Business user can select a pending restaurant candidate from the dashboard.
- The candidate opens the existing new-restaurant flow with suggested name, position, Bite IDs, and Bite evidence prefilled.
- When the business user saves the reviewed candidate, the app calls the backend verification workflow instead of the normal store save path.
- The backend creates the verified Restaurant, creates the initial Menu from the candidate Bites, links the candidate Bites to the new `restaurantId`, and marks the candidate verified.
- The initial Menu saves the business user the first round of typing: each distinct Bite dish name becomes one item, priced with the average of the prices users reported, in a single `Bites` category. The business user then corrects, renames, and structures it in the edit-menu page.

## Supported Evidence

- Business `dashboard`
- `new-restaurant`
- `restaurant/:restaurantId`
- `restaurant/:restaurantId/menu/:menuId`
- `restaurantCandidates` dashboard data and candidate-backed new Restaurant prefill
- `verifyRestaurantCandidate` Firebase callable

## Related GitHub Scope

- Issue \#734 includes opening hours, social links, verified/unverified restaurant handling, menu cleanup, and admin restaurant workflows.
- Issue \#778 / \#942 covers verifying restaurant candidates discovered from repeated Bite evidence into real Restaurants.
- Issue \#1003 seeds the initial Menu of a verified candidate from its Bites.

## Related Domains

- [[Restaurant]]
- [[Bite]]
