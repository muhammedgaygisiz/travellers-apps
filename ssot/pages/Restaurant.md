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
- Verified versus unverified restaurant behavior is an active product area.

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
- `biteIds`
- `bites`
- `socialMediaLinks`
- `description`
- `openingHours`
- `createdAt`
- `createdAtTimestamp`
- `updatedAt`
- `updatedAtTimestamp`

Future or expanding data:

- verification status
- owner or organisation id
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
|-- Organisation or business maintainer (future/expanding)
```

## Lifecycle

```text
Place appears through Bite context
|
Restaurant candidate or business-created restaurant
|
Restaurant saved
|
Menu created
|
Bites linked through restaurantId
|
Profile enriched with image, address, opening hours, links, and description
|
Visible in Bite, restaurant, menu, search, and business flows
```

Current implementation notes:

- Restaurants are stored in `/restaurants/{restaurantId}`.
- Creating a restaurant also creates an empty menu document and stores the `menuId` on the restaurant.
- If `biteIds` are provided during creation, those Bites are updated with the new `restaurantId`.
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
- Edit Restaurant in business app.
- Maintain address, position, social links, opening hours, description, image, and menu.

Related future or expanding use cases:

- Distinguish verified and unverified Restaurants more clearly.
- Suggest verified Restaurant candidates from nearby/fuzzy Bites.
- Link menu items to Bites.
- Show Restaurant tags derived from Bites.
- Support availability, reservation, contact, or visit planning from menu items.

## Related Epics

- Restaurant menu
- Menu items linked to Bites
- Search
- Organisation and BiteTrail packages

## Technical Implementation

Firestore:

```text
/restaurants/{restaurantId}
/menus/{menuId}
/bites/{biteId}
```

Frontend and shared model:

```text
libs/bite-tribe-common/model/src/lib/restaurant.ts
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
```

Storage:

```text
images/restaurants/{restaurantId}/{filename}
```

## Current Limitations

- Verified versus unverified Restaurant rules are still evolving.
- A Bite can use `place` without a `restaurantId`, so restaurant matching can be fuzzy or incomplete.
- Restaurant ownership is not clearly represented in the Restaurant model.
- Menu item actions are not yet connected to Bite creation, reservation, or contact flows.
- Aggregate rating/tag behavior is derived from Bites and not fully formalized in the Restaurant model.

## Future Ideas

- Restaurant verification workflow.
- Restaurant candidate detection from nearby Bites.
- Menu item to Bite creation.
- Restaurant tags from Bites.
- Availability and reservation flows.
- Ownership and organisation management.
- Better Restaurant data quality checks.

## Sources Used

- [[Mission]]
- [[Principles]]
- [[Glossary]]
- [[Use Cases]]
- [[Personas]]
- [[Bite]]
