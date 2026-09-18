# UC - Use Local Gallery Support

## Status

**Level:** L1
Supported today. The gallery, the shared full-screen viewer, the uid-scoped directory behind it
and the filename route back to a Bite all ship. The scoping is the page's substantial fact and
the reason it exists: see `Account Scoping Contract`.

## Goal

Someone who photographed a dish can find that photo again on their own device, full screen, and
get back to the Bite it belongs to. This page owns what the local gallery shows, whose it is,
and how a photo is traced to a Bite; where the copy is written and by whom is the upload flow's,
on [UC - Create And Maintain Personal Bites](uc-create-and-maintain-personal-bites.md).

## Actors

- **Bite Creator** - opens the gallery, views and zooms its own photos, and follows one back to
  its Bite.

## Flow

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
session that an abandoned browser tab never reaches. See GitHub issue [#1328].

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
- Local copies live in app-private storage (`Directory.Data`), not the public `Documents`
  folder they used to sit in. Capacitor maps `Documents` to Android's public external storage,
  which needs `WRITE_EXTERNAL_STORAGE` on API 29 and below - a permission this app does not
  hold. Because the Bite save read its `uri` from that copy, a denial took the whole save down:
  the photo never left the device and nothing said so.

## MVP Classification

**[MVP]** - the account scoping. It is a privacy boundary rather than a feature: before it, a
second account on the same browser profile saw the previous account's photos _and_ learned from
the filenames which Bites they had created.

**[Secondary]** - the gallery surface itself, the zoom and swipe, and the offer to open the Bite
behind a photo. Each is a convenience over photos the device already holds.

## App Store Review Area

Not relevant, because nothing on this page asks for anything. The gallery reads copies the
device already holds, from app-private storage that needs no permission at any API level - see
`Constraints`. The camera and photo-library permissions that put a photo there are collected in
onboarding ([UC - Guide New Users After Registration](uc-guide-new-users-after-registration.md)) and exercised on
[UC - Create And Maintain Personal Bites](uc-create-and-maintain-personal-bites.md).

## Supported Evidence

- `gallery`
- Gallery feature library.
- `common/ui/image-viewer`, shared with the Bite details photo.
- `localImageFileName` in `libs/bite-tribe/api/src/lib/utils/local-image-file.ts`.
- `localImageDirectory` in `libs/common/utils/src/lib/local-image-directory.ts`,
  the single owner of where local copies live.

## Related GitHub Scope

- Issue [#1328] is the account-scoping fix - the gallery moved from a flat, unscoped directory to the uid-scoped one this page now reads. Closed.

## Related Domains

- [Bite](../domain/bite.md)
- [User](../domain/user.md)

## Related Pages

- [Personas](../product/personas.md) - the audience the `Actors` mapping displaced: the Bite creator
- [UC - Create And Maintain Personal Bites](uc-create-and-maintain-personal-bites.md) - the upload flow that writes the local copy, and
  where the camera and photo-library permissions are exercised
- [UC - Inspect Bite Details](uc-inspect-bite-details.md) - the Bite a photo leads back to, and the shared image viewer
- [UC - Guide New Users After Registration](uc-guide-new-users-after-registration.md) - where the photo permissions are collected

[#1328]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1328
