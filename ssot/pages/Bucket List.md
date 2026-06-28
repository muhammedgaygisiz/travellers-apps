# Bucket List

## Purpose

A Bucket List represents a user's saved collection of Bites they want to remember, try, complete, or revisit.

It turns discovery into intent.

## Why It Exists

The goal of a Bucket List is to help a user answer:

> Which Bites do I want to keep for later, and which have I already tried?

Bucket Lists also bridge BiteTrails into a personal user journey.

## Business Rules

- A Bucket List belongs to one user.
- A Bucket List can contain many Bites.
- A Bite can appear in multiple Bucket Lists.
- A Bucket List can optionally originate from one BiteTrail.
- A Bucket List can track tried-out Bites.
- Removing a Bite from a Bucket List also removes its tried-out status for that Bucket List.
- Deleting a Bucket List deletes the list, not the Bites.
- Saving a BiteTrail as a Bucket List writes a sell record for that BiteTrail.

## Required Data

Current model fields:

| Field          | Current name in code | Description                               |
| -------------- | -------------------- | ----------------------------------------- |
| Bucket List id | `id`                 | Unique bucket list identifier.            |
| Owner          | `userId`             | User who owns the list.                   |
| Name           | `name`               | User-visible list name.                   |
| Bites          | `biteIds`            | Ordered or stored collection of Bite ids. |

## Optional Data

- `triedOutBites`
- `biteTrailId`
- `createdAt`
- `createdAtTimestamp`
- `updatedAt`
- `updatedAtTimestamp`

## Relationships

```text
Bucket List
|-- User (owner)
|-- Bites
|-- BiteTrail (optional source)
|-- Tried-out Bite status
```

## Lifecycle

```text
Created manually or from BiteTrail
|
Bites added
|
Bites loaded and displayed
|
Bites marked tried or untried
|
List renamed, sorted, mapped, rated, or edited
|
Bites removed or list deleted
```

Current implementation notes:

- Bucket Lists are stored in `/bucketlists/{bucketlistId}`.
- `biteIds` stores the saved Bites.
- `triedOutBites` stores Bite completion with date and timestamp.
- A Bucket List created from a BiteTrail stores `biteTrailId`.
- Creating a Bucket List from a BiteTrail writes to `/biteTrails/{biteTrailId}/sells`.

## Permissions

- Guest
  - Guest behavior is not the main authenticated app flow today.
- Registered user
  - Create Bucket List.
  - Rename own Bucket List.
  - Delete own Bucket List.
  - Add Bite to Bucket List.
  - Remove Bite from Bucket List.
  - Mark Bite as tried or untried.
  - Save BiteTrail as Bucket List.
  - Rate BiteTrail from a related Bucket List flow.
- Admin
  - No specific Bucket List admin permissions are clearly modeled today.

## Use Cases

Supported today:

- Create Bucket List.
- Create Bucket List and save a Bite.
- Add Bite to Bucket List.
- Remove Bite from Bucket List.
- Rename Bucket List.
- Delete Bucket List.
- View Bucket List.
- View Bucket List on map.
- Mark Bites as tried out.
- Save BiteTrail as Bucket List.
- Rate BiteTrail.

Related future or expanding use cases:

- Progress visualization.
- Completion badges.
- Shared Bucket Lists.
- Better BiteTrail completion journey.

## Related Epics

- BiteTrail gamification
- Marketplace
- Organisation and BiteTrail packages

## Technical Implementation

Firestore:

```text
/bucketlists/{bucketlistId}
/biteTrails/{biteTrailId}/sells/{sellId}
/biteTrails/{biteTrailId}/ratings/{userId}
```

Frontend and shared model:

```text
libs/bite-tribe-common/model/src/lib/bucketlist.ts
libs/bite-tribe/api/src/lib/bucketlist-api/bucketlist-api.service.ts
libs/bite-tribe/bucketlist/page
libs/bite-tribe/bucketlist/data-access
libs/bite-tribe/store/src/lib/bucketlists
```

Cloud Functions:

```text
No dedicated Bucket List Cloud Function is currently modeled.
```

## Current Limitations

- Bucket List sharing is not modeled.
- Ordering behavior is not formalized beyond stored `biteIds`.
- BiteTrail progress and completion rewards are still evolving.
- Sell records are written when saving BiteTrails, but broader purchase/payment semantics are not complete.

## Future Ideas

- Progress bar.
- Completion badge.
- Shareable Bucket Lists.
- Route planning.
- Smart recommendations based on saved Bites.
- Better BiteTrail completion and rating flow.

## Sources Used

- [[Mission]]
- [[Principles]]
- [[Glossary]]
- [[Use Cases]]
- [[Personas]]
- [[Bite]]
