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

## On-Device Copies

Every upload also writes a copy of the image to the device, named after the
owning document (`<collection>_<docId>.<extension>`) so it can be found again
from the id alone. The local gallery, the local image picker, and the retry of a
failed upload all read those copies back.

They live in a directory named after the uid of the user who wrote them, under
`Directory.Documents`. They are scoped to the account rather than to the device
because the device is not a boundary on web: Capacitor's Filesystem is IndexedDB
keyed to the origin, so a flat directory is shared by every account that signs in
through the same browser profile. `localImageDirectory` owns that path and is the
only way in; nothing reads or writes `Documents` directly.

Copies written before this scoping carry no owner. They are adopted into the
signed-in user's directory on a device, where one owner is a safe assumption,
and deleted in a browser, where the previous account is exactly who they might
belong to. See [[UC - Use Local Gallery Support]] and GitHub issue #1328.

## Bite Image Trigger

`setBiteImagePathOnUpload` listens to finalized storage objects for Bite images and updates the matching Bite document with `imagePath`.

## Display Rule

Use `imagePath || image || ''` for image display.

## Code Anchors

```text
apps/bite-tribe-firebase/storage.rules
apps/bite-tribe-firebase/functions/src/functions/set-bite-image-path-on-upload.ts
libs/bite-tribe/api/src/lib/utils/upload-base64-to-firebase-storage.ts
libs/bite-tribe/api/src/lib/utils/write-blob-to-file-system.ts
libs/bite-tribe/api/src/lib/utils/local-image-file.ts
libs/common/utils/src/lib/local-image-directory.ts
libs/common/utils/src/lib/local-image-src.ts
libs/common/utils/src/lib/get-download-url-from-firebase-storage.ts
libs/common/utils/src/lib/storage-path-from-download-url.ts
libs/bite-tribe-common/bite/src/lib/pipes/get-image.pipe.ts
```

## Current Limitations

- Image upload and document update can be separate steps.
- Backgrounding the app can make upload flows fragile.
- Different domains use slightly different image update flows.
