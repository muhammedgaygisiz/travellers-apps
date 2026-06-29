# Architecture - Firebase

## Purpose

Firebase provides backend persistence, authentication integration, storage, functions, emulators, App Check, and analytics support for BiteTribe.

## Main Firebase Surfaces

- Firestore stores product data.
- Firebase Storage stores user, Bite, Restaurant, and BiteTrail images.
- Firebase Authentication provides user identity through Capacitor Firebase Authentication.
- Firebase Functions own backend callables, triggers, scheduled jobs, and storage finalization logic.
- Firebase emulators support local auth, Firestore, storage, functions, and pubsub development.
- App Check protects backend access where configured.
- Firebase Analytics and Crashlytics support telemetry and exception reporting.

## Firestore Collections

```text
bites
users
restaurants
menus
bucketlists
biteTrails
reviews
settings
```

## Functions Pattern

- Frontend-requested backend work uses callable functions.
- Firestore and Storage side effects use triggers.
- Function exports live in `apps/bite-tribe-firebase/functions/src/index.ts`.
- Backend functions live under `apps/bite-tribe-firebase/functions/src/functions`.
- Callable functions should validate `request.auth` before user-scoped reads.

## Current Function Examples

```text
loadBitesByLocation
searchUsers
searchBites
searchRestaurants
updateLastSeen
loadLeaderboard
incrementBiteCountOnBiteCreate
incrementBiteLikeCountOnLikeCreate
decrementBiteLikeCountOnLikeDelete
updateBiteLikeCountOnLikeUpdate
setBiteImagePathOnUpload
notifyFollowersOnNewBite
notifyBiteCreatorOnLike
notifyBiteCreatorOnReview
notifyUserOnNewFollower
sendWeeklyBiteNotification
handleSharedLinkToBite
createUserOnAuthCreate
```

## Local Development

Firebase emulator targets are defined under `apps/bite-tribe-firebase/project.json`.

The app environment exposes emulator ports for Firestore, Functions, Auth, and Storage.

## Code Anchors

```text
apps/bite-tribe-firebase/firebase.json
apps/bite-tribe-firebase/firestore.rules
apps/bite-tribe-firebase/storage.rules
apps/bite-tribe-firebase/functions/src/index.ts
apps/bite-tribe-firebase/functions/src/functions
libs/common/ta-firestore
libs/bite-tribe/api
```

## Current Limitations

- Some backend responsibilities are still split between frontend Firebase access and backend callables.
- App Check health depends on runtime configuration and platform attestation.
- Some aggregate and migration behaviors need operational care because Firestore query semantics can skip documents with missing fields.
