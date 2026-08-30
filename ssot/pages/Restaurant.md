# Restaurant

## Purpose

A Restaurant represents a verified or managed place context around Bites.

Restaurants are not the primary content unit of BiteTribe. They exist to make Bites easier to understand, group, discover, and act on.

## Why It Exists

The goal of a Restaurant is to help users answer:

> Where can I get this Bite, and what else can I understand about this place?

Restaurant context should support dish-first discovery rather than becoming a generic restaurant directory.

## Business Rules

- A Restaurant can contain many Bites.
- A Bite can optionally link to a verified Restaurant through `restaurantId`.
- A Bite can still have a `place` string when no verified Restaurant exists.
- A Restaurant can have one menu.
- A Restaurant can have an address and GPS position.
- A Restaurant can have social media links, opening hours, description, and image.
- Creating a Restaurant can update selected Bites with the new `restaurantId`.
- Verifying a Restaurant candidate creates the Restaurant through the backend, creates its initial Menu from the candidate Bites, updates all candidate Bites with the new `restaurantId`, and records the verification on the candidate.
- The initial Menu is a draft built from evidence, not a claim about the real menu: one item per distinct Bite dish name, priced with the average of the prices users reported, in a single `Bites` category the business user edits afterwards.
- Candidate-backed Restaurant creation should be idempotent: repeated verification of an already verified or merged candidate must return the existing verified Restaurant instead of creating another one.
- Verified versus unverified restaurant behavior is an active product area.
- A Restaurant can record an owner and a claim state, but nothing writes them yet. `ownerUserId` and `claimStatus` exist on the model as of issue \#1074, and a missing `claimStatus` means `unclaimed`. Ownership, claiming, and authorization are specified in [[UC - Own And Claim Restaurants]] and are the prerequisite for every operational restaurant capability.
- Ownership is held by a normal user carrying an additional business role. There is no organisation entity; see [[issue-1371]].
- A Restaurant will be able to have one Floor Plan, containing Rooms and Tables. See [[Floor Plan]] and [[Table]].
- Restaurant tags are derived from the Bites at the place and are not stored on the Restaurant. Bites keep tags exactly as they were typed, so the derived list compares them with a leading `#` stripped and case folded, shows the first spelling that survives that folding, and never shows the `#`. See issue \#1389 and [[issue-1389]].

## Required Data

Current model fields:

| Field         | Current name in code | Description                   |
| ------------- | -------------------- | ----------------------------- |
| Restaurant id | `id`                 | Unique restaurant identifier. |
| Name          | `name`               | Restaurant or place name.     |
| Position      | `position`           | GPS position.                 |

## Optional Data

- `distance`
- `image`
- `imagePath`
- `address`
- `menuId`
- `unsaved`
- `restaurantCandidateId`
- `biteIds`
- `bites`
- `ownerUserId`
- `claimStatus`
- `claimedAt`
- `claimedAtTimestamp`
- `socialMediaLinks`
- `description`
- `openingHours`
- `createdAt`
- `createdAtTimestamp`
- `updatedAt`
- `updatedAtTimestamp`

Future or expanding data:

- verification status
- claim request documents and the review workflow that writes `ownerUserId` and `claimStatus` (issues \#1076 and \#1077); the model fields themselves landed in issue \#1074
- floor plan rooms and tables (issue \#1080)
- table-ordering enablement flag (issue \#1100)
- derived tags from Bites
- aggregate rating and rating count
- menu-item-to-Bite links
- availability or reservation metadata

## Relationships

```text
Restaurant
|-- Bites
|-- Menu
|-- Address
|-- Location
|-- Social Links
|-- Owner or business maintainer (future/expanding)
|-- Floor Plan (planned)
    |-- Rooms
        |-- Tables
            |-- Table Visits
                |-- Orders
```

## Lifecycle

```text
Place appears through Bite context
|
Restaurant candidate or business-created restaurant
|
Restaurant saved
|
Menu created (seeded from Bite evidence for verified candidates)
|
Bites linked through restaurantId
|
Profile enriched with image, address, opening hours, links, and description
|
Visible in Bite, restaurant, menu, search, and business flows
```

Current implementation notes:

- Restaurants are stored in `/restaurants/{restaurantId}`.
- Creating a restaurant also creates a menu document and stores the `menuId` on the restaurant. The business app create path writes an empty menu; candidate verification writes the initial menu derived from the candidate Bites.
- If `biteIds` are provided during creation, those Bites are updated with the new `restaurantId`.
- Candidate-backed creation uses `verifyRestaurantCandidate` so restaurant creation, menu creation, Bite linking, and candidate status changes happen in one backend transaction.
- Candidate verification stores `verifiedRestaurantId`, `verifiedAt`, `verifiedAtTimestamp`, and `verifiedByUserId` on `/restaurantCandidates/{candidateId}`.
- Restaurant image upload stores an `imagePath`.

## Permissions

- Guest
  - Guest behavior is not the main authenticated app flow today.
- Registered user
  - View restaurant and place context through Bite flows.
  - Browse restaurant Bites and menu pages.
- Business user or admin
  - Create Restaurant.
  - Edit Restaurant.
  - Maintain image, address, position, opening hours, social links, description, and menu.
- Admin
  - Verification and moderation are future or operational capabilities, not fully modeled as permissions today.

## Use Cases

Supported today:

- Open verified Restaurant from Bite.
- Open unverified place from Bite.
- View all Bites of a Restaurant.
- View Restaurant menu.
- Search Restaurants.
- Create Restaurant in business app.
- Verify Restaurant candidate in business app.
- Edit Restaurant in business app.
- Maintain address, position, social links, opening hours, description, image, and menu.

Related future or expanding use cases:

- Distinguish verified and unverified Restaurants more clearly.
- Suggest verified Restaurant candidates from nearby/fuzzy Bites.
- Link menu items to Bites.
- Show Restaurant tags derived from Bites.
- Support availability, reservation, contact, or visit planning from menu items.
- [[UC - Own And Claim Restaurants]]
- [[UC - Configure Restaurant Floor Plans And Tables]]
- [[UC - Manage Tables During Service]]
- [[UC - Order At The Table Through A QR Code]]

## Related Epics

- Restaurant menu
- Menu items linked to Bites
- Search
- BiteTrail packages
- Issue \#735 - Restaurant Interaction Platform, the umbrella for ownership, floor plans, table management, QR ordering, and Bites from orders

## Technical Implementation

Firestore:

```text
/restaurants/{restaurantId}
/menus/{menuId}
/bites/{biteId}
/restaurantCandidates/{candidateId}
```

Frontend and shared model:

```text
libs/bite-tribe-common/model/src/lib/restaurant.ts
libs/bite-tribe-common/model/src/lib/restaurant-claim.ts
libs/bite-tribe-common/model/src/lib/menu.ts
libs/bite-tribe/api/src/lib/restaurant-api/restaurant-api.service.ts
libs/bite-tribe/api/src/lib/menu-api/menu-api.service.ts
libs/bite-tribe/restaurant/page
libs/bite-tribe/menu/page
libs/bite-tribe-business/restaurant/page
libs/bite-tribe-business/edit-menu/page
```

Cloud Functions:

```text
searchRestaurants
verifyRestaurantCandidate
```

Storage:

```text
images/restaurants/{restaurantId}/{filename}
```

## Current Limitations

- Restaurants cannot be claimed yet. `Restaurant` now carries `ownerUserId` and `claimStatus`, and `RestaurantClaim` models a claim request, but no writer, collection, role, or rule exists for either: no roles or custom claims exist in the Functions codebase, and `apps/bite-tribe-firebase/firestore.rules` still allows every authenticated user to write every document. Every stored restaurant is `unclaimed` by absence. Product descriptions that assume a claimed restaurant describe a capability that does not exist yet. See [[UC - Own And Claim Restaurants]].
- `MenuItem` has no stable identifier. Items are array entries inside `Menu.categories[]`, addressable only by name and index, so nothing can safely reference a menu item over time. See issue \#1099.
- Verified versus unverified Restaurant rules are still evolving.
- A Bite can use `place` without a `restaurantId`, so restaurant matching can be fuzzy or incomplete.
- Candidate verification currently relies on a business-user workflow and callable auth; explicit role-based authorization is not fully modeled here.
- Menu item actions are not yet connected to Bite creation, reservation, or contact flows.
- Aggregate rating/tag behavior is derived from Bites and not fully formalized in the Restaurant model. Tag deduplication is a display concern in `libs/bite-tribe/restaurant/page`, folding only the `#` prefix and case; near-duplicates such as `asian food` and `asianfood` still show twice, and search and tag suggestions still read the raw stored strings.

## Future Ideas

- Restaurant verification workflow.
- Restaurant candidate detection from nearby Bites.
- Menu item to Bite creation.
- Restaurant tags from Bites.
- Availability and reservation flows.
- Ownership and business role management.
- Better Restaurant data quality checks.

## Sources Used

- [[Mission]]
- [[Principles]]
- [[Glossary]]
- Use Cases section in [[SSOT]]
- [[Personas]]
- [[Bite]]
