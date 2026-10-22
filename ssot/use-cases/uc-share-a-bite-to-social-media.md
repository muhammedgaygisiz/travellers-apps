# UC - Share A Bite To Social Media

## Status

**Level:** L1

Next to implement. Priority P1, post-launch. Nothing of it exists: the app composes no image
anywhere, and the only share action is the details page's share button, which hands a
`/s/bite/<biteId>` link to the device share sheet - that link share is
[UC - Inspect Bite Details](uc-inspect-bite-details.md)'s and stays its. Every rule below is
therefore _Intended, not met_ except `R-4`, which holds today. The epic is [#1723]; each child
listed under `Related GitHub Scope` closes the markers on the rules it delivers. The page stays
at L1 until the composer is built (`UF-2`).

## Goal

A signed-in user viewing any Bite can turn it into a ready-made image and land in Instagram
or Facebook with that image already loaded - as a Story or as an Instagram Post - without
screenshotting, cropping or editing it first. A link becomes neither a Story nor a Post, which
is why the link share alone does not serve these channels.

This page owns the share menu the details page's share button opens, the image composer, what
the image may and may not show, and the hand-off to each target. The link share behind
**More…**, the details page itself, and the landing of a scanned QR code are
[UC - Inspect Bite Details](uc-inspect-bite-details.md)'s.

## Actors

- **Bite Creator** - acts: opens the share menu on a Bite they can see, picks a target, shapes
  the image in the composer and hands it off. It need not be their own Bite.
- **Bite Creator** whose Bite is shared - does not act. Named because attribution on the image
  is about them: whether their display name may appear is decided by their profile's
  visibility, not by the sharer (`R-8`).

## Guarantees

Once a share has succeeded:

| #   | Guarantee                                                                                                                                                                                |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | The chosen app - Instagram Story, Instagram Post or Facebook Story - is open with the generated image already loaded, at most three taps after the share button, on both iOS and Android |
| G2  | The image handed off is the image the preview showed (`R-10`)                                                                                                                            |
| G3  | Where the QR / link field is on, scanning or opening it lands on the Bite under the Shared Link Entry Contract of [UC - Inspect Bite Details](uc-inspect-bite-details.md)                |
| G4  | Nothing was published on the user's behalf. The target app holds the image as a draft, and posting it is the user's own act there                                                        |

## Flow

All of it intended; none of it is built.

- The user taps the share button on a Bite's details page. It opens BiteTribe's own share
  menu with the entries `R-1` names, rather than the device share sheet.
- **More…** runs the link share exactly as it runs today (`R-2`).
- Any other entry opens the composer in that entry's format (`R-5`), with a live preview of the
  current template.
- The Bite's photo is loaded into the canvas with `crossOrigin = 'anonymous'`, so the finished
  canvas can be exported under the CORS policy of `R-15` to `R-19`; a native fetch is the fallback if the bucket cannot carry
  the CORS policy.
- The user swipes through templates, adjusts the template's colours, and switches individual
  fields on and off (`R-6`); the preview follows every change immediately.
- The user confirms, and the canvas is re-encoded to an image (`R-21`) and handed to the
  target:
  - **Instagram Story** - the image is placed as the story background, or as a sticker over a
    background colour, through the `instagram-stories://share` pasteboard on iOS (`R-25`) and the
    `com.instagram.share.ADD_TO_STORY` intent on Android (`R-26`).
  - **Facebook Story** - the same through `facebook-stories://share` on iOS and the
    `com.facebook.stories.ADD_TO_STORY` intent on Android.
  - **Instagram Post** - the image is saved to the photo library (`R-27`) and opened in
    Instagram's feed composer: `instagram://library?LocalIdentifier=…` on iOS, an `ACTION_SEND`
    intent targeted at `com.instagram.android` on Android.
  - **Save image** and **Share image…** - the image is saved, or handed to the system share
    sheet as an image file (`R-12`).
- Each step - composer opened, template chosen, target picked, hand-off succeeded or failed - is
  recorded as an analytics event (`R-29`).

## Rules And Invariants

### Entry And Reach

| ID      | Normative statement                                                                                                                                                                                                                                                                 |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **R-1** | _Intended, not met._ The details page's share button opens a share menu offering **Instagram Story**, **Instagram Post**, **Facebook Story** and **More…**, subject to `R-12`. Delivered by [#1726], with the two app targets beyond the system share sheet by [#1730].             |
| **R-2** | _Intended, not met._ **More…** is the link share that [UC - Inspect Bite Details](uc-inspect-bite-details.md) owns, unchanged: the same link, the same text, the same device share sheet. The menu adds entries in front of it and changes nothing behind it. Delivered by [#1726]. |
| **R-3** | _Intended, not met._ Any Bite the viewer can see can be shared as an image, not only the viewer's own. The composer reads nothing the details page does not already show that viewer, so the image exposes nothing the page did not.                                                |
| **R-4** | An image is a second shareable form of a Bite, not a new shareable entity. The rule that the Bite is the only shareable entity stays [UC - Inspect Bite Details](uc-inspect-bite-details.md)'s, and no BiteTrail, profile, bucket list or restaurant gets an image share.           |

### The Image

| ID       | Normative statement                                                                                                                                                                                                                                                                                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **R-5**  | _Intended, not met._ The image has one of two formats: 9:16 at 1080×1920 for Instagram Story and Facebook Story, and 4:5 at 1080×1350 for Instagram Post. The menu entry decides which the composer opens in. 9:16 is delivered by [#1726], 4:5 by [#1727].                                                                                                                     |
| **R-6**  | _Intended, not met._ The image's fields are the dish photo, the dish name, the restaurant name and city, the price in the Bite's own currency, the rating, a QR code / link to the Bite, and the creator's display name. Each has its own switch in the composer, and the preview updates as soon as one is flipped. All are shown in [#1726]; the switches are [#1728].        |
| **R-7**  | _Intended, not met._ The BiteTribe wordmark is on every image. It has no switch, in any template.                                                                                                                                                                                                                                                                               |
| **R-8**  | _Intended, not met._ The creator's display name is offered only when the creator's profile is public - the same `public` gate the details page applies to the creator line. It is on by default when the Bite is not the sharer's own. It is never offered, and never drawn, for a private creator or for a Bite whose creator has deleted their account. Delivered by [#1728]. |
| **R-9**  | _Intended, not met._ The only personal detail the image may carry is the creator's BiteTribe display name, read as the Review Attribution Contract of [UC - Inspect Bite Details](uc-inspect-bite-details.md) reads it. The name the identity provider holds ([#1308]) and the creator's profile photo are never drawn.                                                         |
| **R-10** | _Intended, not met._ The preview is pixel-identical to the image handed off. There is one rendering, and the preview is it.                                                                                                                                                                                                                                                     |
| **R-11** | _Intended, not met._ The image is rendered on the device. No backend renders it, and no Cloud Function is involved.                                                                                                                                                                                                                                                             |

### Targets

| ID       | Normative statement                                                                                                                                                                                                                                                                                         |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **R-12** | _Intended, not met._ A target whose app is not installed is not offered. **Save image** and **Share image…** are always offered, on web as well as on iOS and Android, so there is never a composed image with nowhere to go. Detection and the native targets are [#1730]; Save image and web are [#1732]. |
| **R-13** | _Intended, not met._ BiteTribe only hands the image to another app. It never posts, publishes or schedules anything on the user's behalf, and uses no Instagram Graph API.                                                                                                                                  |
| **R-14** | _Intended, not met._ Every string the menu and the composer show is a Transloco key, present in every locale.                                                                                                                                                                                               |

### Security

These are the rules of the Security section of [#1723], reviewed before the children were
filed. The CORS policy itself is applied and documented on
[Architecture - Storage](../architecture/storage.md) by [#1725]; the rules below are what it must satisfy.

| ID       | Normative statement                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **R-15** | _Intended, not met._ The bucket's CORS policy grants no access. It only lets a script on an allowed origin read a response the server was already willing to send: who may read a Bite photo stays decided by its tokenised download URL and by `storage.rules`, and this use case changes neither.                                                                                                                              |
| **R-16** | _Intended, not met._ The bucket's CORS policy allows the methods `GET` and `HEAD` only - never `PUT`, `POST` or `DELETE`, because nothing is uploaded through it.                                                                                                                                                                                                                                                                |
| **R-17** | _Intended, not met._ The bucket's CORS policy names its origins explicitly and never `*`: the production web origins `https://bitetribe.app`, `https://www.bitetribe.app` and `https://bite-tribe.web.app`, and the native WebView origins `capacitor://localhost` (iOS) and `https://localhost` (Android, from `androidScheme: 'https'`). It names no `http://localhost` origin, because development uses the Storage emulator. |
| **R-18** | _Intended, not met._ The bucket's CORS policy exposes the response header `Content-Type` only.                                                                                                                                                                                                                                                                                                                                   |
| **R-19** | _Intended, not met._ The CORS policy lives in a version-controlled file, and the `gcloud storage buckets update --cors-file` command that applies it is written on [Architecture - Storage](../architecture/storage.md). `firebase deploy` does not apply it.                                                                                                                                                                    |
| **R-20** | _Intended, not met._ The image is drawn with the canvas text APIs only. No HTML-to-image library and no SVG `foreignObject`: dish names and display names are user content, and rendering them through HTML would recreate the share-page XSS class fixed in [#1488].                                                                                                                                                            |
| **R-21** | _Intended, not met._ Only the re-encoded canvas output is ever handed off. The original upload may carry EXIF GPS data, which re-encoding strips, so no path - Save image and Share image… included - hands off the original file.                                                                                                                                                                                               |
| **R-22** | _Intended, not met._ The image shows no coordinates, no map and no street address. The restaurant name and city are the only location it carries, and the Bite already shows them publicly.                                                                                                                                                                                                                                      |
| **R-23** | _Intended, not met._ The QR code encodes `${BITE_TRIBE_ORIGIN}/s/bite/<biteId>` and nothing else. No user-controlled text goes into it, so it cannot be turned into a phishing link.                                                                                                                                                                                                                                             |
| **R-24** | _Intended, not met._ The analytics events of this use case carry no display name and no free text in their parameters. Delivered by [#1733].                                                                                                                                                                                                                                                                                     |
| **R-25** | _Intended, not met._ On iOS, items written to the Stories pasteboard carry a five-minute `expirationDate` and `localOnly: true`, so the image neither lingers on the pasteboard nor travels through Universal Clipboard. Delivered by [#1730].                                                                                                                                                                                   |
| **R-26** | _Intended, not met._ On Android, the image is written to the app's cache and exposed through a `FileProvider` that is not exported. The intent is explicit (`setPackage`) and grants `FLAG_GRANT_READ_URI_PERMISSION` only, so no other app can intercept it. Delivered by [#1730].                                                                                                                                              |
| **R-27** | _Intended, not met._ On iOS, photo-library access is add-only (`PHAccessLevel.addOnly`). This use case never asks to read the library. Delivered by [#1730] and [#1732].                                                                                                                                                                                                                                                         |
| **R-28** | _Intended, not met._ Only Meta's public App ID enters the repository. The App Secret and the client token never do, and no Meta SDK is added - which keeps out tracking, an App Tracking Transparency prompt and new privacy-label entries. The App ID is registered by the product owner in [#1729].                                                                                                                            |

### Measurement

| ID       | Normative statement                                                                                                                                                                                                                                                                                 |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **R-29** | _Intended, not met._ The funnel is measured step by step: composer opened, template chosen, target picked, and hand-off succeeded or failed, each its own event under `R-24`. The event names are [Implementation - Analytics Events](../implementation/analytics-events.md)'s, written by [#1733]. |

## Authorization

**Enforced.** Nothing new. The composer reads only what the details page already reads for the
viewer (`R-3`), through the same Firestore rules, and it writes nothing to Firestore or Storage.
The CORS policy is not an access control (`R-15`).

**Not enforced.** `storage.rules` still lets any signed-in user overwrite any image, and profile
photos stay readable even for private accounts - both [#1350], open. This use case neither
widens that hole nor depends on it: it only reads, and it never draws a profile photo (`R-9`).

## MVP Classification

**[Secondary]** - the whole page. The epic [#1723] is P1, post-launch, and nothing here is
reachable in the shipping app. The link share behind **More…** is
[UC - Inspect Bite Details](uc-inspect-bite-details.md)'s, and is MVP there.

## App Store Review Area

Relevant, on both stores, and it lands with the code children rather than with this page.

- **iOS** - the Instagram Post hand-off saves to the photo library, so
  `NSPhotoLibraryAddUsageDescription` is required, in every locale's `InfoPlist.strings`.
  Detecting the target apps needs `LSApplicationQueriesSchemes` entries for `instagram`,
  `instagram-stories` and `facebook-stories`. Neither exists today.
- **Android** - detecting the target apps needs `<queries>` package-visibility entries for
  `com.instagram.android` and `com.facebook.katana`. Saving through MediaStore needs no storage
  permission on API 29 and up.
- **Privacy** - no new data is collected: the image is composed on the device and handed to
  another app at the user's request. The declarations in
  [Implementation - Store Declarations](../implementation/store-declarations.md) need re-checking only if a Meta SDK is added,
  which `R-28` rules out.
- **Store listing** - the composer is a candidate for a store screenshot.

## Supported Evidence

Not implemented. The surfaces this will touch are:

- `shareBite` in `libs/bite-tribe/details/data-access/src/lib/details-data-access.service.ts` -
  today's link share through `@capacitor/share`, which `R-2` keeps behind **More…**.
- The `bite-details-share` button in
  `libs/bite-tribe/details/page/src/lib/components/details-page/details.page.html`, and the
  `biteCreatorData.public` gate in the same template that `R-8` reuses.
- `BITE_TRIBE_ORIGIN`, from which both the link share and the QR code (`R-23`) are built.
- The iOS `Info.plist` and `InfoPlist.strings`, and the Android manifest (`App Store Review Area`).

## Related GitHub Scope

- Part of [#1723], the epic: share a Bite as an image to Instagram and Facebook. Open.
- [#1724] writes this page.
- [#1725] lets a Bite photo be drawn into a canvas and exported - `R-15` to `R-19`. Must land
  before [#1726].
- [#1726] is the share menu and the composer with the first template at 9:16 - `R-1`, `R-2`,
  `R-5`, and the fields of `R-6` all shown.
- [#1727] is the Instagram Post format at 4:5 - `R-5`.
- [#1728] is the field switches, and the creator-name gate - `R-6`, `R-8`.
- [#1729] registers the Meta app and provides its App ID. Owned by the product owner, not an
  agent - `R-28`.
- [#1730] is the native Stories and feed hand-off for both platforms, with the plist and manifest
  entries - `R-12`, `R-25` to `R-27`. Depends on [#1729].
- [#1731] is the template gallery and colour customisation.
- [#1732] is Save image and web support for the composer - `R-12`, `R-27`.
- [#1733] is the analytics for the funnel - `R-24`, `R-29`.

## Related Domains

- [Bite](../domain/bite.md)
- [User](../domain/user.md)

## Related Pages

- [UC - Inspect Bite Details](uc-inspect-bite-details.md) - the share button, the link share behind
  More…, the Shared Link Entry Contract a scanned QR code lands under, and the Review
  Attribution Contract the creator name follows
- [UC - Manage Profile And Social Graph](uc-manage-profile-and-social-graph.md) - the public and private profile `R-8` reads
- [Architecture - Storage](../architecture/storage.md) - where the CORS policy and its apply command are written
- [Implementation - Social Media Channels](../implementation/social-media-channels.md) - the `@bitetribeapp` handle the cards may carry
- [Implementation - Store Declarations](../implementation/store-declarations.md)
- [Implementation - Localization](../implementation/localization.md)
- [Implementation - Analytics Events](../implementation/analytics-events.md)
- [Current State - Open Questions](../current-state/open-questions.md) - the template count and design, and
  the QR link length, which are questions and not rules

[#1308]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1308
[#1350]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1350
[#1488]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1488
[#1723]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1723
[#1724]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1724
[#1725]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1725
[#1726]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1726
[#1727]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1727
[#1728]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1728
[#1729]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1729
[#1730]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1730
[#1731]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1731
[#1732]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1732
[#1733]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1733
