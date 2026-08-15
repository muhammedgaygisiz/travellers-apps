# UC - Use Local Gallery Support

## Status

Supported today.

## Goal

Users can access locally stored BiteTribe image content.

## Actors

- Bite creator

## Current Flow

- User opens the local gallery.
- The app shows the BiteTribe images this device stored for that account.
- User taps an image, which opens it full screen.
- User zooms by pinch or double-tap, pans the zoomed photo, and swipes between images.
- When the image's filename identifies a Bite, the viewer offers to open that Bite.
- Closing the viewer, or returning from a Bite, leaves the user where they were in the gallery.

## Product Intent

A gallery tile is tappable and its tap opens the photo, not the Bite. The Bite
is a second, explicit step offered inside the viewer, because only some locally
stored photos can be traced back to one.

## Account Scoping Contract

The gallery is scoped to the signed-in account, not to the device. It reads a
directory named after the user's uid, so a second account signing in on the same
device or browser profile sees its own, empty gallery.

This is a security boundary rather than a tidiness preference. A flat directory
was shared by every account on a browser profile, and what leaked was not only
the photographs: the filenames name the Bites their owner created, so the next
user also learned that. Logging out did not clear it, and `Delete all` is manual.
Scoping the read is therefore what holds, not a cleanup step at the end of a
session that an abandoned browser tab never reaches. See GitHub issue #1328.

The same directory backs the local image picker and the retry of a failed
upload, so all three are scoped by the same rule.

## Constraints

- Nobody signed in means no gallery. The photos of whoever used the device
  before are never a fallback.
- Local copies written before the scoping are adopted by the signed-in user on a
  device and deleted in a browser, where they may be the previous account's. A
  web user therefore loses their local gallery once, on the release that
  introduces the scoping.
- The Bite behind a photo is read from its filename alone, following the
  `bites_<biteId>.<extension>` convention that the upload flow writes. Photos
  saved before that convention, or written by anything else, offer no Bite.
- The filename is not proof that the Bite still exists. A deleted Bite is
  answered by the Bite details page, which has to handle that case for the home
  feed and shared links regardless.

## Supported Evidence

- `gallery`
- Gallery feature library.
- `common/ui/image-viewer`, shared with the Bite details photo.
- `localImageFileName` in `libs/bite-tribe/api/src/lib/utils/local-image-file.ts`.
- `localImageDirectory` in `libs/common/utils/src/lib/local-image-directory.ts`,
  the single owner of where local copies live.

## Related Domains

- [[Bite]]
- [[User]]
