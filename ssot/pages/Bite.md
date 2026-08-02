# Bite

## Purpose

A Bite represents a real food experience shared by a user.

It is the central entity of BiteTribe and the smallest unit of food-discovery content in the platform.

Unlike restaurant review platforms, BiteTribe treats dishes as first-class citizens. Restaurants, places, menus, profiles, maps, bucket lists, and BiteTrails exist as context around a Bite.

## Why It Exists

The goal of a Bite is to help another user answer:

> What should I eat?

rather than only:

> Which restaurant should I visit?

A good Bite makes one concrete dish understandable enough that another person can decide whether it is relevant for them.

## Business Rules

- A Bite should represent exactly one dish or food item.
- A Bite belongs to one creator.
- A Bite belongs to one place context.
- A Bite has one geographic position.
- A Bite can optionally be linked to a verified restaurant.
- A Bite may contain multiple tags.
- A Bite can be liked.
- A Bite can be reviewed.
- A Bite can be added to bucket lists.
- A Bite can be part of BiteTrail-based journeys.
- A Bite is the only entity with a public share link and a native deep link
  (`/s/bite/*`). Users, bucket lists, restaurants, and BiteTrails are not
  shareable. See [[issue-1190]].
- A Bite should have an image because the image is a core trust signal.
- Deleting a Bite currently deletes the Firestore document and attempts to delete its stored image.
- Deleting a Bite must decrement the creator's `biteCount` aggregate because Bite creation increments it.
- Historical references after deletion are a product question, not a fully established current rule.

## Required Data

Current model fields:

| Field             | Current name in code | Description                                            |
| ----------------- | -------------------- | ------------------------------------------------------ |
| Unique identifier | `id`                 | Unique Bite identifier.                                |
| Dish image        | `image`              | Image data/reference used during creation and display. |
| Dish name         | `name`               | Name of the dish or food item.                         |
| Place             | `place`              | Human-readable place or restaurant name.               |
| Price             | `price`              | Price paid or entered by the creator.                  |
| Location          | `position`           | GPS position of the Bite.                              |

Required by product intent, but optional or not strictly enforced in the shared TypeScript model today:

| Field             | Current name in code              | Description                                                                        |
| ----------------- | --------------------------------- | ---------------------------------------------------------------------------------- |
| Creator           | `userId`                          | User who created the Bite. It is set when the Bite is created.                     |
| Created timestamp | `createdAt`, `createdAtTimestamp` | Created during Bite creation for display, sorting, and queries.                    |
| Currency          | `currency`                        | Original currency of the entered price.                                            |
| Rating            | `rating`                          | Optional user evaluation signal today, but important for content quality.          |
| Address status    | `addressStatus`                   | New Bites start as `pending`; backend geocoding marks them `resolved` or `failed`. |

## Optional Data

- `description`
- `tags`
- `restaurantId`
- `geohash`
- `imagePath`
- `updatedAt`
- `updatedAtTimestamp`
- `city`
- `region`
- `country`
- `countryCode`
- `formatted`
- `distance`
- `likes`
- `thumbup`
- `drooling`
- `mindblown`
- `priceInPreferredCurrency`
- `priceInPreferredCurrencySymbol`

Future or not currently part of the Bite model:

- menu item id
- duplicate-detection metadata
- generated dish description
- food-recognition metadata

## Relationships

```text
Bite
|-- User (creator)
|-- Restaurant (optional verified restaurant link)
|-- Place (human-readable place context)
|-- Location (GPS position and geohash)
|-- Bucket Lists
|-- BiteTrails
|-- Likes
|-- Reviews
```

## Lifecycle

Target product lifecycle:

```text
Draft
|
Image selected or uploaded
|
Location determined
|
Place or restaurant selected
|
Saved
|
Visible in feed, map, search, profiles, restaurants, bucket lists, or BiteTrails
|
Edited, deleted, or referenced by surrounding journeys
```

Current implementation notes:

- The app creates the Bite document id locally before image upload so the image can reference the Bite id.
- `geohash` is derived from the Bite position at creation.
- New Bite documents are written with `addressStatus = pending`; `enrichBiteAddressOnCreate` reverse-geocodes the Bite position asynchronously and writes `city`, `region`, `country`, `countryCode`, `formatted`, and a final address status.
- Older Bite documents without address enrichment are migrated through the business migrations backfill path, which calls `backfillBiteAddress` for the selected Bite.
- Enriched city data powers `searchBitesByCity`.
- During Bite creation, `getCurrencyByPosition` can resolve the selected position to a country currency and prefill the form currency; the user's preferred currency remains the fallback.
- During Bite creation, the user selects the Bite place through the restaurant selector before saving. The selector can use nearby verified restaurants, unverified restaurants, nearby Google Places, or the explicit custom-place fallback.
- The Bite page warns users when the entered price looks suspiciously high.
- Uploaded Bite images are stored below `images/bites/{biteId}/{filename}`.
- `setBiteImagePathOnUpload` updates `imagePath` after a matching storage upload is finalized.
- The current delete flow removes the Bite document and attempts to remove the image file.

## Permissions

Current product expectation:

- Guest
  - Public read behavior is not the main authenticated app flow today.
- Registered user
  - Create Bite.
  - Edit own Bite.
  - Delete own Bite.
  - Like Bite.
  - Review Bite.
  - Save Bite to bucket list.
  - Discover Bites through feed, map, search, restaurant, profile, bucket list, and BiteTrail flows.
- Admin
  - Moderation is a future or operational capability, not a clearly modeled Bite permission in the current code.

## Use Cases

Supported today:

- Create Bite.
- Edit Bite.
- Delete Bite.
- Discover nearby Bites.
- View Bite details.
- Search for Bites.
- Search for Bites by city.
- Like Bite.
- Review Bite.
- Add Bite to bucket list.
- Show Bites by restaurant.
- Show Bites by user.
- Show Bites in BiteTrail and marketplace-related journeys.

Related future or expanding use cases:

- Create a Bite from a menu item.
- Improve Bite quality checks.
- Detect duplicate Bites.
- Match Bites to restaurants or menu items more reliably.
- Use Bite quality in search, feed, map, and BiteTrail ranking.

## Related Epics

- Search
- Discovery feed
- Restaurant menu
- Menu items linked to Bites
- Marketplace
- BiteTrail gamification
- Onboarding assistant
- Localization and data quality

## Technical Implementation

Firestore:

```text
/bites/{biteId}
/bites/{biteId}/likes/{userId}
/reviews/{reviewId}
/bucketlists/{bucketlistId}
```

Frontend and shared model:

```text
libs/bite-tribe-common/model/src/lib/bite.ts
libs/bite-tribe/api/src/lib/bite-api/bite-api.service.ts
libs/bite-tribe/api/src/lib/bite-api/utils/create-bite.ts
libs/bite-tribe/api/src/lib/bite-api/utils/save-edited-bite.ts
libs/bite-tribe/api/src/lib/bite-api/utils/load-bite-by-id.ts
libs/bite-tribe/api/src/lib/bite-api/utils/load-bites-by-location.ts
libs/bite-tribe/store/src/lib/bites
libs/bite-tribe/bite/page
libs/bite-tribe/details/page
```

Cloud Functions:

```text
loadBitesByLocation
searchBites
searchBitesByCity
searchNearbyPlaces
getCurrencyByPosition
setBiteImagePathOnUpload
enrichBiteAddressOnCreate
backfillBiteAddress
notifyFollowersOnNewBite
notifyOnNewCountryBadge
notifyBiteCreatorOnLike
incrementBiteLikeCountOnLikeCreate
decrementBiteLikeCountOnLikeDelete
updateBiteLikeCountOnLikeUpdate
notifyBiteCreatorOnReview
incrementBiteCountOnBiteCreate
handleSharedLinkToBite
sendWeeklyBiteNotification
```

Storage:

```text
images/bites/{biteId}/{filename}
```

## Current Limitations

- Restaurant matching can be fuzzy or implicit because a Bite may only have `place` without `restaurantId`.
- Currency conversion is represented as derived presentation data, not as the canonical price.
- Image upload and image path synchronization are separate steps.
- Image upload can fail or become fragile when the app is backgrounded.
- City and country are enriched asynchronously and may be missing on older or failed-enrichment Bite documents.
- Menu item linking is not part of the current Bite model.
- Historical behavior for deleted Bites needs a clearer product rule.
- Counter aggregates must stay symmetric across create/delete lifecycles. If a future aggregate increments when a Bite, like, review, or related counted document is created, add the matching decrement behavior when that counted document can be deleted.
- Older Bite documents may not have like aggregate fields. Like-count triggers migrate missing `thumbup`, `drooling`, and `mindblown` fields by recomputing counts from the Bite's `likes` subcollection before applying ongoing delta maintenance.
- The like aggregates are eventually consistent, so the client cannot treat them as the only source for the displayed reaction counter. A reaction the client already knows about - an own reaction written optimistically, or an old Bite whose aggregates were never migrated - is not yet reflected in `thumbup`, `drooling`, or `mindblown`, and issue \#1165 showed the counter dropping to the empty chip on the Bite details and restaurant pages while the reaction chip was already rendered as liked. `getLikeCount` in `libs/bite-tribe-common/bite/src/lib/utils/like-counts.ts` therefore takes the higher of the aggregate and the loaded `likes` per like type. Reading only the aggregate field is a regression.
- Guest permissions and admin moderation are not clearly expressed as current Bite-domain capabilities.

## Future Ideas

- AI-generated dish description.
- Automatic menu matching.
- Duplicate Bite detection.
- Food recognition.
- Stronger restaurant/place matching.
- More evidence around whether location/currency mismatch warnings are needed beyond prefill, fallback, and manual override.
- Bite completeness score.
- Bite quality signals for ranking in feed, map, search, and BiteTrails.
- Menu-item-to-Bite creation flow.

## Sources Used

- [[Mission]]
- [[Principles]]
- [[Glossary]]
- Use Cases section in [[SSOT]]
- [[Personas]]
