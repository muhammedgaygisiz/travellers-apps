# UC - Use Local Gallery Support

## Status

Supported today.

## Goal

Users can access locally stored BiteTribe image content.

## Actors

- Bite creator

## Current Flow

- User opens the local gallery.
- The app shows locally stored BiteTribe images.
- User taps an image, which opens it full screen.
- User zooms by pinch or double-tap, pans the zoomed photo, and swipes between images.
- When the image's filename identifies a Bite, the viewer offers to open that Bite.
- Closing the viewer, or returning from a Bite, leaves the user where they were in the gallery.

## Product Intent

A gallery tile is tappable and its tap opens the photo, not the Bite. The Bite
is a second, explicit step offered inside the viewer, because only some locally
stored photos can be traced back to one.

## Constraints

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

## Related Domains

- [[Bite]]
- [[User]]
