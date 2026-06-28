# UC - Receive App Notifications And Engagement Updates

## Status

Supported today.

## Goal

Users and creators can receive engagement signals around Bites and social activity.

## Actors

- Bite creator
- User
- Food lover

## Current Flow

- Backend functions react to new Bites, likes, reviews, followers, and weekly activity.
- Notifications or shared-link behavior keep users connected to activity.

## Supported Evidence

- `notifyFollowersOnNewBite`
- `notifyBiteCreatorOnLike`
- `notifyBiteCreatorOnReview`
- `notifyUserOnNewFollower`
- `sendWeeklyBiteNotification`
- `handleSharedLinkToBite`

## Related Domains

- [[User]]
- [[Bite]]
