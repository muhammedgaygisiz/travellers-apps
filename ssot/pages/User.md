# User

## Purpose

A User represents a person, creator, organisation, or restaurant-facing profile participating in BiteTribe.

Users are the trust layer around Bites. They create Bites, follow each other, save food experiences, rate BiteTrails, and provide the social context that helps other people decide what to eat.

## Why It Exists

The goal of a User is to answer:

> Who shared this food experience, and can I trust their context?

A Bite without creator context is weaker because BiteTribe depends on human food experiences, not anonymous listings.

## Business Rules

- A User can create many Bites.
- A User can have a public or private profile.
- A User can follow and be followed by other users.
- A User can save Bites to bucket lists.
- A User can save a BiteTrail as a bucket list.
- A User can like and review Bites.
- A User can rate a BiteTrail once.
- A User can represent an individual, organisation, or restaurant-like profile.
- Public profile quality affects trust in Bites and BiteTrails.

## Required Data

Current profile model fields:

| Field        | Current name in code | Description                                    |
| ------------ | -------------------- | ---------------------------------------------- |
| User id      | `userId`             | Auth/user identifier and profile document id.  |
| Display name | `displayName`        | Public display identity.                       |
| Email        | `email`              | Account email, also used in search.            |
| Photo        | `photoUrl`           | Profile image URL or uploaded image reference. |

## Optional Data

- `fullName`
- `city`
- `about`
- `public`
- `biteCount`
- `subscriptionTier`
- `isOrganisation`
- `isRestaurant`
- `createdAt`
- `createdAtTimestamp`
- `updatedAt`
- `updatedAtTimestamp`
- `lastSeen`
- `lastSeenTimestamp`

## Relationships

```text
User
|-- Bites (creator)
|-- Bucket Lists
|-- Likes
|-- Reviews
|-- Followers
|-- Following
|-- BiteTrails (owner, organisation, or curator)
|-- BiteTrail ratings
```

## Lifecycle

```text
Authenticated
|
Profile created
|
Public/private profile chosen
|
Profile maintained
|
Creates or discovers Bites
|
Follows, likes, reviews, saves, or curates
|
Last seen and contribution signals updated
```

Current implementation notes:

- A public user document is stored in `/users/{userId}`.
- `saveUser` initializes profile data from the authenticated user.
- Profile images can be uploaded and mirrored into Firebase-backed URLs.
- `updateLastSeen` is handled through a backend callable.
- Follow relationships are stored under `/users/{targetUserId}/followers/{currentUserId}` and `/users/{currentUserId}/following/{targetUserId}`.

## Permissions

- Guest
  - Guest behavior is not the main authenticated app flow today.
- Registered user
  - Create and update own profile.
  - Choose public/private profile state.
  - Follow and unfollow users.
  - Create Bites.
  - Like, review, and save food experiences.
  - Create bucket lists and save BiteTrails.
- Admin
  - Moderation and user administration are future or operational capabilities, not clearly modeled in the current User domain code.

## Use Cases

Supported today:

- Create public/private user profile.
- Edit profile.
- Upload profile image.
- View own profile.
- View public profile.
- Follow and unfollow users.
- View followers and following.
- Search users by display name, full name, or email.
- Update last seen.
- Show bite count in leaderboard.

Related future or expanding use cases:

- Onboarding assistant.
- Better privacy guidance.
- Organisation profile management.
- Restaurant profile ownership.
- Creator credibility and badges.

## Related Epics

- Onboarding assistant
- Search
- Marketplace
- BiteTrail gamification
- Organisation and BiteTrail packages

## Technical Implementation

Firestore:

```text
/users/{userId}
/users/{userId}/followers/{followerUserId}
/users/{userId}/following/{followedUserId}
/biteTrails/{biteTrailId}/ratings/{userId}
```

Frontend and shared model:

```text
libs/bite-tribe-common/model/src/lib/public-user.ts
libs/bite-tribe-common/model/src/lib/user.ts
libs/bite-tribe/api/src/lib/profile-api.service.ts
libs/bite-tribe/profile/page
libs/bite-tribe/followers/page
libs/bite-tribe/store/src/lib/app
```

Cloud Functions:

```text
createUserOnAuthCreate
updateLastSeen
searchUsers
loadLeaderboard
incrementBiteCountOnBiteCreate
notifyUserOnNewFollower
```

Storage:

```text
images/users/{userId}/{filename}
```

## Current Limitations

- Organisation and restaurant user profile behavior exists in fields but is still evolving as a product concept.
- Public/private visibility needs clearer user-facing guidance.
- Admin moderation is not clearly modeled.
- Profile trust and creator credibility are mostly implicit.
- Onboarding after registration is not complete.

## Future Ideas

- Guided onboarding for username, public profile, currency, and first actions.
- Creator profile completeness score.
- Creator badges.
- Organisation-owned creator teams.
- Clearer public/private profile controls.
- Better trust signals for search and Bite ranking.

## Sources Used

- [[Mission]]
- [[Principles]]
- [[Glossary]]
- Use Cases section in [[SSOT]]
- [[Personas]]
- [[Bite]]
