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
belong to. See [UC - Use Local Gallery Support](../use-cases/uc-use-local-gallery-support.md) and GitHub issue [#1328].

## Bite Image Trigger

`setBiteImagePathOnUpload` listens to finalized storage objects for Bite images and updates the matching Bite document with `imagePath`.

## Storage Rules

`storage.rules` scopes every path by owner (issue [#1350], the Storage
counterpart of [#1078]). There is no catch-all: only the four Main Paths above
can be written, and anything else is refused to every account, operators
included.

| Path                                  | Owner, as the rule reads it                  | Operator (`admin`) |
| ------------------------------------- | -------------------------------------------- | ------------------ |
| `images/users/{userId}/…`             | the path: `request.auth.uid == userId`       | read only          |
| `images/bites/{biteId}/…`             | `bites/{biteId}.userId`, via `firestore.get` | read, write        |
| `images/restaurants/{restaurantId}/…` | `restaurants/{restaurantId}.ownerUserIds`    | read, write        |
| `images/biteTrails/{biteTrailId}/…`   | `biteTrails/{biteTrailId}.ownerId`           | read, write        |

- **Writes** go to the owner only, and must be an `image/*` content type under
  10 MB. An anonymous table guest writes nothing.
- **A Bite that does not exist yet may receive its photo.** `createBite` writes
  the document without awaiting it, so the upload can land first. The window
  grants nothing: Bite ids are client-made UUIDs nobody knows before the
  document exists, and the Bite Image Trigger skips an object whose Bite is
  missing.
- **Reads are scoped like writes, and that does not hide any image.** The apps
  show every image through the tokenised download URL on its document, and a
  token URL bypasses the rules. A rules read only gates `getDownloadUrl` and
  metadata, which the apps call on what they have just uploaded. A private
  profile photo stays private because `firestore.rules` does not let a
  stranger read the user document that holds its URL.
- The Admin SDK is not subject to the rules: account deletion removes
  `images/users/{uid}/` and keeps the photos of surviving Bites ([#1234]), and
  `deleteBiteAsOperator` removes a Bite's photo.

**Cross-service lookups need a one-time IAM grant per project.** `firestore.get`
in Storage rules runs as the Storage service agent,
`service-<project number>@gcp-sa-firebasestorage.iam.gserviceaccount.com`, and
needs `roles/firebaserules.firestoreServiceAgent`. CI deploys with
`--non-interactive`, which skips the grant firebase-tools offers interactively,
and the CI accounts cannot read or change IAM. Without the role every lookup
errors, and every Bite, restaurant and Bite Trail upload is refused. Grant it
before the first deploy to a new project:

```bash
gcloud projects add-iam-policy-binding <project> --member=serviceAccount:service-<project number>@gcp-sa-firebasestorage.iam.gserviceaccount.com --role=roles/firebaserules.firestoreServiceAgent
```

The suite is `src/storage-rules/__specs__/storage-rules.emulator-spec.ts`, run
by `npx nx firebase-test-rules bite-tribe-firebase` next to the Firestore one,
with the Storage and Firestore emulators together. It has an allow and a deny
case per path; against the old blanket rule 13 of them fail. It seeds the
project `emulators:exec --project` names, because the Storage emulator answers
`firestore.get` from that project's database whatever project the request
names.

## Display Rule

Use `imagePath || image || ''` for image display.

## Bucket CORS Policy

The bucket `bite-tribe.firebasestorage.app` carries a CORS policy so that a Bite photo can be
drawn into a `<canvas>` and exported. Without it the canvas is tainted, and `toBlob()` and
`toDataURL()` throw a `SecurityError` - which is what stops the share image of
[UC - Share A Bite To Social Media](../use-cases/uc-share-a-bite-to-social-media.md) from ever producing a file. The image is
requested with `crossOrigin = 'anonymous'` through `loadBiteImageForCanvas`, which resolves the
address by the Display Rule above.

The policy is `apps/bite-tribe-firebase/storage.cors.json`, and the rules it must satisfy are
`UC-SBS` `R-15` to `R-19`: `GET` and `HEAD` only, an explicit origin list and never `*`, and
`Content-Type` as the only response header. It grants no access. Who may read a photo stays
decided by its tokenised download URL and by `storage.rules`.

**It is applied by hand.** `firebase deploy` does not touch a bucket's CORS configuration, and
nothing in CI does either. Whoever changes the file applies it, with an account that holds
Storage Admin on the `bite-tribe` project:

```bash
gcloud storage buckets update gs://bite-tribe.firebasestorage.app --cors-file=apps/bite-tribe-firebase/storage.cors.json
```

and checks that the live policy now equals the file:

```bash
gcloud storage buckets describe gs://bite-tribe.firebasestorage.app --format="json(cors_config)"
```

Uploads and deletes do not depend on this policy. They go through `@capacitor-firebase/storage`:
the native SDK on iOS and Android, and on web the Firebase Storage API, which answers CORS
itself. That is why the policy can allow reads only.

The Storage emulator ignores the policy, so development needs no `http://localhost` origin.

## Code Anchors

```text
apps/bite-tribe-firebase/storage.rules
apps/bite-tribe-firebase/functions/src/storage-rules/__specs__/storage-rules.emulator-spec.ts
apps/bite-tribe-firebase/storage.cors.json
apps/bite-tribe-firebase/functions/src/functions/bites/set-bite-image-path-on-upload.ts
libs/bite-tribe/api/src/lib/utils/upload-base64-to-firebase-storage.ts
libs/bite-tribe/api/src/lib/utils/write-blob-to-file-system.ts
libs/bite-tribe/api/src/lib/utils/local-image-file.ts
libs/common/utils/src/lib/local-image-directory.ts
libs/common/utils/src/lib/local-image-src.ts
libs/common/utils/src/lib/get-download-url-from-firebase-storage.ts
libs/common/utils/src/lib/storage-path-from-download-url.ts
libs/bite-tribe-common/bite/src/lib/pipes/get-image.pipe.ts
libs/bite-tribe-common/bite/src/lib/utils/bite-image-src.ts
libs/bite-tribe-common/bite/src/lib/utils/load-bite-image-for-canvas.ts
```

## Current Limitations

- Image upload and document update can be separate steps.
- Backgrounding the app can make upload flows fragile.
- Different domains use slightly different image update flows.

[#1078]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1078
[#1234]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1234
[#1328]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1328
[#1350]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1350
