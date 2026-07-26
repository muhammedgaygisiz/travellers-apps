# Bite Trail

## Purpose

A BiteTrail is a curated journey made from multiple Bites.

It packages local food knowledge into a discoverable experience that users can follow, save, rate, and eventually buy or claim through the marketplace.

## Why It Exists

The goal of a BiteTrail is to help a user answer:

> Which curated food journey should I follow?

BiteTrails turn isolated food discoveries into a guided sequence or collection with creator, organisation, location, and price context.

## Business Rules

- A BiteTrail has one owner.
- A BiteTrail contains many Bites.
- A BiteTrail has a name, description, location, price, currency, and image.
- A BiteTrail can be free when `price` is `0`.
- A BiteTrail can be saved as a Bucket List.
- A BiteTrail can have sell records.
- A BiteTrail can have user ratings.
- A BiteTrail should preserve the authenticity of its underlying Bites.
- A BiteTrail should be useful as a journey, not just a loose list.
- A paid BiteTrail is sold through store in-app purchase. Its Bites are readable only by the owner and by verified buyers, and a non-buyer sees a preview. See [[Monetization]] and [[epic-1125]].
- A creator receives 80 percent and BiteTribe 20 percent of net proceeds, meaning the amount remaining after the store commission. Gross-based wording cannot be honoured and must never be used.
- A creator cannot publish a paid BiteTrail before identity verification, payout onboarding and creator terms are complete.
- Unpublishing a paid BiteTrail does not revoke access for existing buyers. A refund does.

## Required Data

Current model fields:

| Field        | Current name in code | Description                                             |
| ------------ | -------------------- | ------------------------------------------------------- |
| BiteTrail id | `id`                 | Unique BiteTrail identifier.                            |
| Owner        | `ownerId`            | User, organisation, or creator that owns the BiteTrail. |
| Name         | `name`               | User-visible BiteTrail title.                           |
| Bites        | `biteIds`            | Bites included in the journey.                          |
| Image        | `imagePath`          | Display image for the BiteTrail.                        |
| Owner image  | `ownerImagePath`     | Display image for the owner.                            |
| Owner name   | `ownerName`          | Display name of the owner.                              |
| Location     | `location`           | Human-readable location context.                        |
| Description  | `description`        | Explanation of the journey.                             |
| Price        | `price`              | Price of the BiteTrail.                                 |
| Currency     | `currency`           | Currency of the price.                                  |

## Optional Data

- `soldCount`
- `image`
- `createdAt`
- `createdAtTimestamp`
- `updatedAt`
- `updatedAtTimestamp`

Related subcollection data:

- `sells`
- `ratings`

## Relationships

```text
BiteTrail
|-- User or Organisation (owner)
|-- Bites
|-- Bucket Lists (saved user copies)
|-- Market Place
|-- Sells
|-- Ratings
```

## Lifecycle

```text
Curated by owner
|
Bites selected
|
Metadata and image added
|
Published to biteTrails
|
Visible in Market Place
|
Opened as detail and map
|
Saved as Bucket List
|
Rated or counted as sold
```

Current implementation notes:

- BiteTrails are stored in `/biteTrails/{biteTrailId}`.
- Creating a BiteTrail uploads an image and writes `imagePath`.
- The marketplace loads BiteTrails from the `biteTrails` collection.
- `soldCount` is derived by counting `/biteTrails/{biteTrailId}/sells`.
- Saving a BiteTrail as Bucket List writes a sell record.
- Ratings are stored under `/biteTrails/{biteTrailId}/ratings/{userId}`.

## Permissions

- Guest
  - Guest behavior is not the main authenticated app flow today.
- Registered user
  - View BiteTrails.
  - Open BiteTrail detail and map.
  - Save BiteTrail as Bucket List.
  - Rate a BiteTrail once.
- Organisation or business user
  - Create BiteTrail.
  - Curate Bites into a BiteTrail.
- Admin
  - Moderation and publishing control are future or operational capabilities, not clearly modeled today.

## Use Cases

Supported today:

- Create BiteTrail in business app.
- View BiteTrails in Marketplace.
- Open BiteTrail detail.
- Open BiteTrail map.
- Save BiteTrail as Bucket List.
- Count sells.
- Rate BiteTrail.

Related future or expanding use cases:

- Manage existing BiteTrails of an organisation.
- Select Bites from assigned users.
- Show free BiteTrail content.
- Monthly BiteTrail contest.
- Completion badge.
- Paid marketplace purchase flow.

## Related Epics

- Organisation and BiteTrail packages
- Marketplace
- BiteTrail gamification
- [[epic-1125]] paid BiteTrails and creator revenue share

## Technical Implementation

Firestore:

```text
/biteTrails/{biteTrailId}
/biteTrails/{biteTrailId}/sells/{sellId}
/biteTrails/{biteTrailId}/ratings/{userId}
/bucketlists/{bucketlistId}
/bites/{biteId}
```

Frontend and shared model:

```text
libs/bite-tribe-common/model/src/lib/bite-trail.ts
libs/bite-tribe-common/model/src/lib/bite-trail-rating.ts
libs/bite-tribe/api/src/lib/bite-trail-api/bite-trail-api.service.ts
libs/bite-tribe/bite-trail/data-access
libs/bite-tribe/bite-trail/page
libs/bite-tribe-common/bite-trail
libs/bite-tribe-business/create-bite-trail
```

Cloud Functions:

```text
No dedicated BiteTrail Cloud Function is currently modeled.
```

Storage:

```text
images/biteTrails/{biteTrailId}/{filename}
```

## Current Limitations

- BiteTrail ownership works through owner fields, but organisation/team workflows are still evolving.
- Paid purchase semantics are not complete; current sell records are lightweight.
- Completion progress and badges are not complete.
- BiteTrail management after creation is limited.
- Ranking, curation quality, and duplicate handling are not formalized.

## Future Ideas

- Paid BiteTrail purchase.
- Free BiteTrail claim flow.
- Organisation BiteTrail dashboard.
- Assigned-user Bite selection.
- Completion badge.
- Monthly contest.
- Progress visualization.
- Curator analytics.

## Sources Used

- [[Mission]]
- [[Principles]]
- [[Glossary]]
- Use Cases section in [[SSOT]]
- [[Personas]]
- [[Bite]]
- [[Bucket List]]
