# Architecture - Storage

## Purpose

Storage holds image assets used by Bites, profiles, Restaurants, and BiteTrails.

## Storage Pattern

```text
Image selected in app
|
Base64 or file content uploaded to Firebase Storage
|
Download URL resolved or generated
|
Firestore document updated with imagePath
|
UI displays imagePath || image || ''
```

## Main Paths

```text
images/bites/{biteId}/{filename}
images/users/{userId}/{filename}
images/restaurants/{restaurantId}/{filename}
images/biteTrails/{biteTrailId}/{filename}
```

## Bite Image Trigger

`setBiteImagePathOnUpload` listens to finalized storage objects for Bite images and updates the matching Bite document with `imagePath`.

## Display Rule

Use `imagePath || image || ''` for image display.

## Code Anchors

```text
apps/bite-tribe-firebase/storage.rules
apps/bite-tribe-firebase/functions/src/functions/set-bite-image-path-on-upload.ts
libs/bite-tribe/api/src/lib/utils/upload-base64-to-firebase-storage.ts
libs/common/utils/src/lib/get-download-url-from-firebase-storage.ts
libs/common/utils/src/lib/storage-path-from-download-url.ts
libs/bite-tribe-common/bite/src/lib/pipes/get-image.pipe.ts
```

## Current Limitations

- Image upload and document update can be separate steps.
- Backgrounding the app can make upload flows fragile.
- Different domains use slightly different image update flows.
