# UC - Share A Bite To Social Media

## Status

**Level:** L1

In progress. Priority P1, post-launch. The share menu and the first template ship with
[#1726]: on the user's own Bite the share button opens BiteTribe's menu, its three app entries
open the composer - Instagram Post at 4:5 since [#1727], the two Stories at 9:16 - and the
finished image goes to the system share sheet; **More…** is
the link share of [UC - Inspect Bite Details](uc-inspect-bite-details.md), unchanged. Opening
Instagram or Facebook directly, saving and analytics are still to come. The
rules without a marker below hold today; `R-1`, `R-3` and `R-8` hold in part and keep theirs until the child that finishes them. The epic is [#1723];
each child listed under `Related GitHub Scope` closes the markers on the rules it delivers. The
page stays at L1 until the behaviour is complete enough to enumerate (`UF-2`).

**For now this use case covers the sharer's own Bites only.** Sharing somebody else's Bite as an
image is blocked by [#1772]: BiteTribe publishes a privacy policy and no terms of use, so no
creator has licensed anyone to copy their photo onto another platform (`R-30`). Every child of
[#1723] delivers the own-Bite share; the rules that concern somebody else's Bite are written
here so that [#1772] has a contract to deliver, and nothing before it builds them.

## Goal

A signed-in user can turn one of their own Bites into a ready-made image and land in Instagram
or Facebook with that image already loaded - as a Story or as an Instagram Post - without
screenshotting, cropping or editing it first. A link becomes neither a Story nor a Post, which
is why the link share alone does not serve these channels. Doing the same with a public
creator's Bite, once that creator has licensed it, follows with [#1772].

This page owns the share menu the details page's share button opens, the image composer, what
the image may and may not show, and the hand-off to each target. The link share behind
**More…**, the details page itself, and the landing of a scanned QR code are
[UC - Inspect Bite Details](uc-inspect-bite-details.md)'s.

## Actors

- **Bite Creator** - acts: opens the share menu on one of their own Bites, picks a target,
  shapes the image in the composer and hands it off. They took the photo, so every choice is
  theirs. Once [#1772] lands they may also share a public creator's Bite, under that creator's
  licence (`R-3`).
- **Bite Creator** whose Bite would be shared by somebody else - does not act, and is not
  reached before [#1772]. Named because the photo is theirs:
  whether others may share it as an image, and whether their name appears on it, is decided by
  their profile's visibility, their acceptance of the terms and their own attribution choice -
  never by the sharer (`R-3`, `R-8`, `R-30`, `R-31`).

## Guarantees

Once a share has succeeded:

| #   | Guarantee                                                                                                                                                                                |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | The chosen app - Instagram Story, Instagram Post or Facebook Story - is open with the generated image already loaded, at most three taps after the share button, on both iOS and Android |
| G2  | The image handed off is the image the preview showed (`R-10`)                                                                                                                            |
| G3  | Where the QR / link field is on, scanning or opening it lands on the Bite under the Shared Link Entry Contract of [UC - Inspect Bite Details](uc-inspect-bite-details.md)                |
| G4  | Nothing was published on the user's behalf. The target app holds the image as a draft, and posting it is the user's own act there                                                        |

## Flow

Built by [#1726], [#1727], [#1728] and [#1731]: the menu on the user's own Bite, **More…**, and
the composer in the entry's format with a choice of layout and colours and a switch per field,
handing the image to the system share sheet. The rest - the hand-off to each app and analytics - is intended.

- The user taps the share button on the details page of one of their own Bites (`R-3`). It opens BiteTribe's own share
  menu with the entries `R-1` names, rather than the device share sheet.
- **More…** runs the link share exactly as it runs today (`R-2`).
- Any other entry opens the composer in that entry's format (`R-5`), with a live preview of the
  current template.
- The Bite's photo is loaded into the canvas with `crossOrigin = 'anonymous'`, so the finished
  canvas can be exported under the CORS policy of `R-15` to `R-19`.
- The user picks Classic or Wide by swiping on the preview or tapping (`R-32`), picks a
  background and a text colour legible on it (`R-33`), and switches individual fields on and
  off (`R-6`); the preview follows every change immediately.
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

| ID      | Normative statement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **R-1** | _Intended, not met._ On a Bite that `R-3` lets the viewer share as an image, the details page's share button opens a share menu offering **Instagram Story**, **Instagram Post**, **Facebook Story** and **More…**, subject to `R-12`. On any other Bite it runs the link share directly, as it does today. Delivered by [#1726], with the two app targets beyond the system share sheet by [#1730].                                                                                                                                                                                                                                                                                     |
| **R-2** | **More…** is the link share that [UC - Inspect Bite Details](uc-inspect-bite-details.md) owns, unchanged: the same link, the same text, the same device share sheet. The menu adds entries in front of it and changes nothing behind it. Delivered by [#1726].                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **R-3** | _Intended, not met._ Who may share a Bite as an image depends on whose Bite it is. **The sharer's own Bite** can always be shared, because the sharer took the photo. **Somebody else's Bite** can be shared only when its creator's profile is public, their account still exists, and they have accepted terms that license it (`R-30`). The Bite of a private creator, of a deleted account, or of a creator who has not accepted the terms is never shared as an image by anyone else; the link share stays open for it. In every case the composer reads nothing the details page does not already show the viewer. The own-Bite half is delivered by [#1726], the rest by [#1772]. |
| **R-4** | An image is a second shareable form of a Bite, not a new shareable entity. The rule that the Bite is the only shareable entity stays [UC - Inspect Bite Details](uc-inspect-bite-details.md)'s, and no BiteTrail, profile, bucket list or restaurant gets an image share.                                                                                                                                                                                                                                                                                                                                                                                                                |

### The Image

| ID       | Normative statement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **R-5**  | The image has one of two formats: 9:16 at 1080×1920 for Instagram Story and Facebook Story, and 4:5 at 1080×1350 for Instagram Post. The menu entry decides which the composer opens in. 9:16 is delivered by [#1726], 4:5 by [#1727].                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **R-6**  | The image's fields are the dish photo, the dish name, the restaurant name and city, the price in the Bite's own currency, the rating, a QR code / link to the Bite, and the creator's display name. Each has its own switch in the composer, except two: the creator's display name, whose presence `R-8` decides, and the QR code, which - like the wordmark (`R-7`) - is on every image, because it is how a viewer of the post finds the Bite; the preview updates as soon as one is flipped. A field the Bite has no value for gets no switch, and a field switched off leaves no gap: the text closes up behind it, and without the photo it moves to the top. The sharer's name sits on the photo, or takes a line of its own when the photo is off. All but the creator's display name are shown in [#1726]; the switches and the name are [#1728]. |
| **R-7**  | The BiteTribe wordmark is on every image. It has no switch, in any template.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **R-8**  | _Intended, not met._ Attribution is the photographer's choice, never the sharer's. On **the sharer's own Bite** the sharer is the photographer: the display name is offered with a switch, which starts off because the sharer's own account already identifies them, and is offered only while their profile is public - the same `public` gate the details page applies to the creator line. On **somebody else's Bite** there is no switch: the creator's display name is drawn, unless that creator has chosen under `R-31` to be shared without it. A private creator or a deleted account is never named, which `R-3` already guarantees by never reaching the composer for their Bites. The own-Bite switch is delivered by [#1728], the rest by [#1772].                                                                                           |
| **R-9**  | The only personal detail the image may carry is the creator's BiteTribe display name, read as the Review Attribution Contract of [UC - Inspect Bite Details](uc-inspect-bite-details.md) reads it. The name the identity provider holds ([#1308]) and the creator's profile photo are never drawn.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **R-10** | The preview is pixel-identical to the image handed off. There is one rendering, and the preview is it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **R-11** | The image is rendered on the device. No backend renders it, and no Cloud Function is involved.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **R-32** | The image comes in two layouts, **Classic** - the photo framed in the card - and **Wide** - the photo edge to edge at the top - in both formats. A layout is data the one shared renderer reads; no layout has drawing code of its own, so every rule of this page holds in every layout. A design that needs new drawing structure is a decision of its own, not a new layout. Delivered by [#1731].                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **R-33** | The colours are chosen separately from the layout: one of five background gradients (Night, Dusk, Ocean, Sunset, Paper) and one of five text colours (White, Cream, Honey, Ink, Cocoa), on either layout. A text colour is offered only where it reaches a contrast of 4.5:1 against both ends of the background's gradient, so the wordmark and the text are always legible; a background that makes the chosen text colour illegible switches it to the first legible one. There is no free colour picker. Delivered by [#1731].                                                                                                                                                                                                                                                                                                                         |

### Targets

| ID       | Normative statement                                                                                                                                                                                                                                                                                         |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **R-12** | _Intended, not met._ A target whose app is not installed is not offered. **Save image** and **Share image…** are always offered, on web as well as on iOS and Android, so there is never a composed image with nowhere to go. Detection and the native targets are [#1730]; Save image and web are [#1732]. |
| **R-13** | _Intended, not met._ BiteTribe only hands the image to another app. It never posts, publishes or schedules anything on the user's behalf, and uses no Instagram Graph API.                                                                                                                                  |
| **R-14** | Every string the menu and the composer show is a Transloco key, present in every locale.                                                                                                                                                                                                                    |

### Rights And Attribution

A Bite photo is the creator's work, protected as a photograph under Swiss and EU copyright
law. Turning it into an image for another platform copies it, adapts it - by cropping it and
overlaying text - and makes it available outside BiteTribe, all of which need the
photographer's permission. Showing a Bite inside BiteTribe does not grant that. These rules
come from a product review of the epic, not from legal advice, and need a lawyer's
confirmation before the terms are published.

| ID       | Normative statement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **R-30** | _Intended, not met._ Somebody else's Bite is shared as an image only under terms of use the creator has accepted. The terms grant BiteTribe a non-exclusive, worldwide, royalty-free licence, which BiteTribe may pass on to other users, to copy the Bite photo, adapt it into a share image, and make that image available on third-party platforms under those platforms' own terms. The terms also say how attribution works (`R-8`, `R-31`), and the creator confirms they hold any consent needed from people shown in the photo. A creator who has not accepted them - every existing account, until it actively accepts - is treated as `R-3` treats a private one. Delivered by [#1772], which blocks the image share of somebody else's Bite, not of one's own. |
| **R-31** | _Intended, not met._ A creator chooses, for their own Bites, whether others who share them as an image name them or not. Being named is the default, because it is the photographer's right unless they choose otherwise. The choice belongs to the creator's settings and is never offered to a sharer. No issue yet.                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

### Security

These are the rules of the Security section of [#1723], reviewed before the children were
filed. The CORS policy itself is applied and documented on
[Architecture - Storage](../architecture/storage.md) by [#1725]; the rules below are what it must satisfy.

| ID       | Normative statement                                                                                                                                                                                                                                                                                                                                                                                         |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **R-15** | The bucket's CORS policy grants no access. It only lets a script on an allowed origin read a response the server was already willing to send: who may read a Bite photo stays decided by its tokenised download URL and by `storage.rules`, and this use case changes neither.                                                                                                                              |
| **R-16** | The bucket's CORS policy allows the methods `GET` and `HEAD` only - never `PUT`, `POST` or `DELETE`, because nothing is uploaded through it.                                                                                                                                                                                                                                                                |
| **R-17** | The bucket's CORS policy names its origins explicitly and never `*`: the production web origins `https://bitetribe.app`, `https://www.bitetribe.app` and `https://bite-tribe.web.app`, and the native WebView origins `capacitor://localhost` (iOS) and `https://localhost` (Android, from `androidScheme: 'https'`). It names no `http://localhost` origin, because development uses the Storage emulator. |
| **R-18** | The bucket's CORS policy exposes the response header `Content-Type` only.                                                                                                                                                                                                                                                                                                                                   |
| **R-19** | The CORS policy lives in a version-controlled file, and the `gcloud storage buckets update --cors-file` command that applies it is written on [Architecture - Storage](../architecture/storage.md). `firebase deploy` does not apply it.                                                                                                                                                                    |
| **R-20** | The image is drawn with the canvas text APIs only. No HTML-to-image library and no SVG `foreignObject`: dish names and display names are user content, and rendering them through HTML would recreate the share-page XSS class fixed in [#1488].                                                                                                                                                            |
| **R-21** | Only the re-encoded canvas output is ever handed off. The original upload may carry EXIF GPS data, which re-encoding strips, so no path - Save image and Share image… included - hands off the original file.                                                                                                                                                                                               |
| **R-22** | The image shows no coordinates, no map and no street address. The restaurant name and city are the only location it carries, and the Bite already shows them publicly.                                                                                                                                                                                                                                      |
| **R-23** | The QR code encodes `${BITE_TRIBE_ORIGIN}/s/bite/<biteId>` and nothing else. No user-controlled text goes into it, so it cannot be turned into a phishing link.                                                                                                                                                                                                                                             |
| **R-24** | _Intended, not met._ The analytics events of this use case carry no display name and no free text in their parameters. Delivered by [#1733].                                                                                                                                                                                                                                                                |
| **R-25** | _Intended, not met._ On iOS, items written to the Stories pasteboard carry a five-minute `expirationDate` and `localOnly: true`, so the image neither lingers on the pasteboard nor travels through Universal Clipboard. Delivered by [#1730].                                                                                                                                                              |
| **R-26** | _Intended, not met._ On Android, the image is written to the app's cache and exposed through a `FileProvider` that is not exported. The intent is explicit (`setPackage`) and grants `FLAG_GRANT_READ_URI_PERMISSION` only, so no other app can intercept it. Delivered by [#1730].                                                                                                                         |
| **R-27** | _Intended, not met._ On iOS, photo-library access is add-only (`PHAccessLevel.addOnly`). This use case never asks to read the library. Delivered by [#1730] and [#1732].                                                                                                                                                                                                                                    |
| **R-28** | _Intended, not met._ Only Meta's public App ID enters the repository. The App Secret and the client token never do, and no Meta SDK is added - which keeps out tracking, an App Tracking Transparency prompt and new privacy-label entries. The App ID is registered by the product owner in [#1729].                                                                                                       |

### Measurement

| ID       | Normative statement                                                                                                                                                                                                                                                                                 |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **R-29** | _Intended, not met._ The funnel is measured step by step: composer opened, template chosen, target picked, and hand-off succeeded or failed, each its own event under `R-24`. The event names are [Implementation - Analytics Events](../implementation/analytics-events.md)'s, written by [#1733]. |

## Authorization

**Enforced.** Nothing new. The composer reads only what the details page already reads for the
viewer (`R-3`), through the same Firestore rules, and it writes nothing to Firestore or Storage.
The CORS policy is not an access control (`R-15`).

**Not an access control.** `R-3`'s rule of whose Bite may become an image is decided in the
client, because the image is composed there. It is a licence boundary, not a confidentiality
one: it decides what BiteTribe produces and hands on, and cannot stop a viewer taking a
screenshot of a Bite they can already see.

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

- `libs/bite-tribe/share-image/ui` (`bite-tribe/share-image-ui`): `drawShareImage`, which draws
  the template with the canvas 2D API alone; `toShareImageContent`, the whole list of what an
  image may say; `ShareImagePreviewComponent`, whose canvas is both the preview and the export;
  and `ShareImageComposerComponent`, the modal. Storybook `Components/Share Image` covers long
  names, a missing price or rating, a missing photo and markup in a dish name.
- `canShareBiteAsImage` in `bite-tribe-common/bite` - the one place `R-3` is decided, which
  [#1772] widens.
- `DetailsService.onShareBiteClick` and `DetailsDataAccessService.shareBiteImage` in
  `libs/bite-tribe/details` - the menu, the composer modal, and the file handed to the share
  sheet. `shareBite`, behind **More…**, is unchanged.
- `sharedBiteUrl` in `libs/common/utils`, which both the link share and the QR code use (`R-23`).
- `loadBiteImageForCanvas` in `bite-tribe-common/bite`, and the bucket CORS policy of
  [Architecture - Storage](../architecture/storage.md), from [#1725].
- Checked on 23 October 2026 against the emulators in a desktop browser: the menu on the user's
  own Bite and none on somebody else's; More… sharing the same link and text as before; and an
  export of 1080×1920 from a geotagged photo, carrying no EXIF, whose QR code decodes to the
  Bite's `/s/bite/` address.
- Checked the same day on the iOS simulator (iPhone 15 Pro), with a development build against the
  emulators: the menu as an iOS action sheet, the composer drawing the photo from inside the
  `capacitor://localhost` WebView, and the native share sheet receiving a 1080×1920 JPEG from the
  cache directory. WebKit's encoder writes three EXIF tags of its own - colour space and pixel
  size - and no GPS block. Also checked the same day on an Android 36
  emulator (Pixel 7), with a development build against the emulators: the menu, the composer
  drawing the photo from inside the `https://localhost` WebView, an export of 1080×1920 with
  no EXIF at all, and the Android share sheet receiving it as an image from the app's cache.

## Related GitHub Scope

- Part of [#1723], the epic: share a Bite as an image to Instagram and Facebook. Open.
- [#1724] writes this page.
- [#1725] lets a Bite photo be drawn into a canvas and exported - `R-15` to `R-19`. Must land
  before [#1726].
- [#1726] is the share menu and the composer with the first template at 9:16, on the sharer's
  own Bites - `R-1`, `R-2`, the own-Bite half of `R-3`, the 9:16 half of `R-5`, and the fields of `R-6` all
  shown. It and every child after it cover the sharer's own Bites only.
- [#1727] is the Instagram Post format at 4:5, with a layout of its own - the 4:5 half of `R-5`.
- [#1728] is the field switches, including the sharer's own name - `R-6`, and the own-Bite half
  of `R-8`.
- [#1772] is the terms of use, the creator's acceptance and the licence it grants - `R-30`, and
  the rest of `R-3` and `R-8`. It blocks the image share of somebody else's Bite.
- No issue yet owns the creator's attribution choice (`R-31`). It does not block anything:
  until it exists, nobody can opt out, and `R-8` draws the name on every shared Bite that is
  not the sharer's own.
- [#1729] registers the Meta app and provides its App ID. Owned by the product owner, not an
  agent - `R-28`.
- [#1730] is the native Stories and feed hand-off for both platforms, with the plist and manifest
  entries - `R-12`, `R-25` to `R-27`. Depends on [#1729].
- [#1731] is the layout choice, Classic and Wide, and the colour choice - `R-32`, `R-33`.
- [#1732] is Save image and web support for the composer - `R-12`, `R-27`.
- [#1733] is the analytics for the funnel - `R-24`, `R-29`.

## Related Domains

- [Bite](../domain/bite.md)
- [User](../domain/user.md)

## Related Pages

- [UC - Inspect Bite Details](uc-inspect-bite-details.md) - the share button, the link share behind
  More…, the Shared Link Entry Contract a scanned QR code lands under, and the Review
  Attribution Contract the creator name follows
- [UC - Manage Profile And Social Graph](uc-manage-profile-and-social-graph.md) - the public and private profile `R-3` and `R-8` read
- [UC - Use Account And Legal Flows](uc-use-account-and-legal-flows.md) - the legal texts a user can read today, a privacy
  policy and no terms of use, and the deletion that leaves a Bite's photo behind with no account
  to license it
- [Architecture - Storage](../architecture/storage.md) - where the CORS policy and its apply command are written
- [Implementation - Social Media Channels](../implementation/social-media-channels.md) - the `@bitetribeapp` handle the cards may carry
- [Implementation - Store Declarations](../implementation/store-declarations.md)
- [Implementation - Localization](../implementation/localization.md)
- [Implementation - Analytics Events](../implementation/analytics-events.md)
- [Current State - Open Questions](../current-state/open-questions.md) - the template count and design, the
  QR link length, and the terms of use, which are questions and not rules

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
[#1772]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1772
