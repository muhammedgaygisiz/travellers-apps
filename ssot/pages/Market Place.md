# Market Place

## Purpose

The Market Place is the discovery and conversion surface for curated food experiences.

Today it primarily lists BiteTrails. Conceptually, it is where creators, organisations, and businesses can offer curated Bite-based journeys to users.

## Why It Exists

The goal of the Market Place is to help a user answer:

> Which curated food experience should I claim, save, or buy?

It is the business-facing extension of BiteTribe's authentic discovery loop.

## Business Rules

- The Market Place should expose curated experiences, not generic ads.
- Current marketplace items are BiteTrails.
- A marketplace item should be grounded in real Bites.
- A free BiteTrail can be saved as a Bucket List.
- Sell counts are derived from BiteTrail sell records.
- Marketplace value depends on creator, organisation, Bite, and BiteTrail trust.
- The Market Place should not weaken the dish-first mission.
- A paid BiteTrail sells through store in-app purchase, and its Bites stay locked until the purchase is verified. A non-buyer sees a preview only. See [[Monetization]] and [[epic-1125]].
- Paid BiteTrail revenue is shared with the creator at 80 percent of net proceeds, meaning the amount remaining after the store commission. Gross-based wording must never be used.
- Advertising and marketplace inventory stay separate. The Market Place exposes curated experiences, and ads live only in the home feed.

## Required Data

There is no standalone Market Place model today.

Current marketplace listing data comes from BiteTrail fields:

| Field       | Current name in code                     | Description                      |
| ----------- | ---------------------------------------- | -------------------------------- |
| Item id     | `id`                                     | BiteTrail id.                    |
| Name        | `name`                                   | BiteTrail title.                 |
| Image       | `imagePath`                              | Listing image.                   |
| Owner       | `ownerId`, `ownerName`, `ownerImagePath` | Creator or organisation context. |
| Location    | `location`                               | Journey location.                |
| Description | `description`                            | Offer explanation.               |
| Price       | `price`                                  | Offer price.                     |
| Currency    | `currency`                               | Offer currency.                  |
| Bites       | `biteIds`                                | Included Bites.                  |

## Optional Data

- `soldCount`
- ratings
- sell records
- future purchase/payment state
- future category or campaign metadata

## Relationships

```text
Market Place
|-- BiteTrails
|-- Bites
|-- Users or Organisations (owners)
|-- Bucket Lists (saved copies)
|-- Sells
|-- Ratings
```

## Lifecycle

```text
BiteTrail created
|
Marketplace loads BiteTrails
|
Sold count derived
|
User opens BiteTrail
|
User saves or claims BiteTrail
|
Bucket List created
|
Sell record written
```

Current implementation notes:

- The Market Place page loads the `biteTrails` collection.
- For each BiteTrail, it counts `/biteTrails/{biteTrailId}/sells`.
- The Market Place page displays BiteTrail cards and navigates users into BiteTrail detail.

## Permissions

- Guest
  - Guest behavior is not the main authenticated app flow today.
- Registered user
  - View Market Place.
  - Open BiteTrail detail.
  - Save or claim free BiteTrails as Bucket Lists.
- Creator, organisation, or business user
  - Create BiteTrails through business tooling.
- Admin
  - Marketplace moderation, approval, and payment operations are future or operational capabilities, not clearly modeled today.

## Use Cases

Supported today:

- View Market Place.
- Load BiteTrails.
- Show sold count.
- Open BiteTrail detail.
- Save BiteTrail as Bucket List.

Related future or expanding use cases:

- Paid BiteTrail purchase.
- Marketplace campaign pages.
- Creator/organisation storefront.
- Marketplace moderation.
- Better offer ranking.
- Sold badge and analytics.

## Related Epics

- Organisation and BiteTrail packages
- Marketplace
- BiteTrail gamification
- Search
- [[epic-1125]] paid BiteTrails and creator revenue share

## Technical Implementation

Firestore:

```text
/biteTrails/{biteTrailId}
/biteTrails/{biteTrailId}/sells/{sellId}
/bucketlists/{bucketlistId}
```

Frontend and shared model:

```text
libs/bite-tribe/market-place/data-access/src/lib/market-place-data-access.service.ts
libs/bite-tribe/market-place/page
libs/bite-tribe-common/model/src/lib/bite-trail.ts
libs/bite-tribe-common/bite-trail
libs/bite-tribe/bite-trail/page
```

Cloud Functions:

```text
No dedicated Market Place Cloud Function is currently modeled.
```

Storage:

```text
Uses BiteTrail images from images/biteTrails/{biteTrailId}/{filename}.
```

## Current Limitations

- There is no standalone marketplace item model.
- Marketplace currently lists BiteTrails only.
- Payment and purchase lifecycle are not complete.
- Marketplace ranking, categories, moderation, and campaign logic are not formalized.
- Organisation storefront behavior is still evolving.

## Future Ideas

- Marketplace item model.
- Paid checkout.
- Creator and organisation storefronts.
- Campaign landing pages.
- Ranking and recommendation logic.
- Marketplace moderation.
- Analytics for creators and organisations.

## Sources Used

- [[Mission]]
- [[Principles]]
- [[Glossary]]
- Use Cases section in [[SSOT]]
- [[Personas]]
- [[Bite Trail]]
- [[Bucket List]]
