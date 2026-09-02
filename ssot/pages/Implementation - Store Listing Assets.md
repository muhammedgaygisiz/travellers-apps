# Implementation - Store Listing Assets

## Purpose

Store listing assets owns the decided store identity, the listing copy, and the
asset rules behind the App Store and Google Play entries.

[[Implementation - Store Release Steps]] owns the upload procedure. This page
owns what gets uploaded, so the listing is reviewable and versioned instead of
living only in the two consoles.

Listing content belongs in the SSOT graph. `docs/` is a legacy folder that
predates the graph and must not gain a store directory.

[Issue #1178](https://github.com/muhammedgaygisiz/travellers-apps/issues/1178)
tracks filling both entries.

## Console Coordinates

|                   | App Store Connect     | Google Play Console       |
| ----------------- | --------------------- | ------------------------- |
| Store record      | Apple ID `6746098595` | app `4974419595752386792` |
| Developer account | Muhammed Gaygisiz     | `7071224469761655403`     |
| Bundle / package  | `com.bitetribe.app`   | `com.bitetribe.app`       |
| SKU               | `bitribe4711`         | –                         |
| Primary language  | English (U.S.)        | en-US                     |

## Decided Identity

Decided 21 August 2026 for the release candidate. Change these only through a
new decision recorded on this page, not by editing a console field.

| Field                        | Value                             |
| ---------------------------- | --------------------------------- |
| Name                         | BiteTribe                         |
| Subtitle / short description | Find it. Try it. Share it.        |
| Primary category             | Food & Drink, on both stores      |
| Secondary category           | Social Networking, App Store only |
| Listing locales              | The eleven shipped locales        |

Applied on 21 August 2026: Play's category moved from Entertainment to Food &
Drink and is in Google's review queue; Apple carries Food & Drink with Social
Networking as its secondary. Both listings were English-only until 30 August 2026;
Play now carries ten translations and the App Store nine, written out in
[[Implementation - Store Listing Translations]].

## Distribution And Pricing

Set on the App Store on 21 August 2026.

| Field          | Value                                          |
| -------------- | ---------------------------------------------- |
| Price          | Free                                           |
| Base region    | Switzerland (CHF)                              |
| Availability   | All 175 countries or regions, France included  |
| Content Rights | Third-party content, with the necessary rights |

The base region is the territory Apple does **not** auto-adjust for tax and
foreign-exchange movement. It has no effect while the app is free, and it was
set to Switzerland to match the developer entity — the Android upload
certificate reads `C=CH, ST=Berne`. Pro subscriptions ([[epic-1124]]) and paid
BiteTrails ([[epic-1125]]) each choose their own base territory, so this field
stays cosmetic even once there is revenue.

Content Rights is answered **yes, with the necessary rights**, because the app
shows three kinds of content it does not own: OpenStreetMap tiles, attributed
`© OpenStreetMap contributors` in
`libs/bite-tribe-common/map/src/lib/map/utils/create-openstreetmap-layer.ts`;
Google Places results behind `searchPlaces` and `searchNearbyPlaces`; and every
user-generated Bite.

France is deliberately in scope. [[Current State - Release State]] had reserved
it pending a check of France's own encryption rules; that item is now decided
and closed there.

### Name Spelling

**BiteTribe is one word in prose. The header wordmark keeps the space.**

The one-word form is the spelling used by [[Mission]],
[[ADR-0001 Dish First Product]], the bundle identifier, and both store records.
It is the product name wherever the name is written as text.

The in-app header is the exception, and a deliberate one. `APP_TITLE` feeds
`page.component.html`, which renders it through `| uppercase` beside the mascot,
and `BITE TRIBE` reads better locked up that way than `BITETRIBE` does. That is a
typographic decision about a wordmark, not a second spelling of the product —
the same distinction most brands draw between a logotype and running text.

Rule: the spaced form is a defect wherever the name is written as text, and
correct in exactly two places — the rendered header wordmark, and the Nx project
and directory names (`bite-tribe`), which are kebab-case identifiers rather than
the product name.

The repository was corrected on 21 August 2026. The spaced form had reached
well past the app UI, and every one of these now carries the one-word spelling:

| Surface                                        | Where                                                                                                  |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| App locale JSON, 4 keys                        | `apps/bite-tribe/src/assets/i18n/*.json` and the business equivalent                                   |
| Document title                                 | `apps/bite-tribe/src/index.html`, `apps/bite-tribe-business/src/index.html`                            |
| Mail sender name                               | `SENDER_NAME` in `apps/bite-tribe-firebase/functions/src/functions/users/google-workspace-email.ts`    |
| Verification mail copy                         | `emailVerification.subject` and body in all eleven `functions/src/functions/shared/i18n/messages/*.ts` |
| CI step names, README, agent instruction files | prose that names the product                                                                           |

German compounds the name with hyphens, so `Bite-Tribe-E-Mail-Adresse` became
`BiteTribe-E-Mail-Adresse`. A search for the spaced form alone misses it.

Four categories were deliberately left spaced, because they are not the product
name being written down as text:

- **The header wordmark.** `APP_TITLE` in both shell providers, and the
  twenty-one Storybook stories plus one spec that mock the token, all keep
  `Bite Tribe`. Changing them was reverted the same day.
- The GitHub project board is literally named `Bite Tribe`. Documentation that
  names it is describing an external identifier, not the product. Renaming the
  board is a separate operational decision.
- [[issue-1265]] and [[Current State - Release Candidate Test Charter]] record
  dated console state and observed mail headers. Rewriting a past observation
  would make it assert something that was never true.
- Historical changelog entries under `build-*` quote past commit subjects.

The rule reaches the social accounts too, and there it does a second job.
`@bitetribe` on Instagram is an unrelated food business that writes itself
**Bite Tribe**, with a space, so following our own spelling is also what tells
the two apart. The handle is `bitetribeapp` and the display name is
`BiteTribe`; see [[Implementation - Social Media Channels]].

### Console Follow-Up The Rename Owes

The rename moved two values that live outside this repository, and both must be
changed before the next functions deploy or the registration and resend mails
present two identities again — the exact defect [[issue-1265]] closed:

1. The Firebase Auth `Email address verification` template subject, to
   `Verify your BiteTribe email address`.
2. The `Send mail as` display name on the delegated Workspace mailbox, to
   `BiteTribe`, so it agrees with `SENDER_NAME`. Gmail rewrites the visible
   sender when it does not, and no spec can catch that.

See [[Implementation - Firebase Functions]].

### Category

Food & Drink over Entertainment, because [[ADR-0001 Dish First Product]] makes
the bite — not the venue and not the content — the product unit, and because
Play already carries the `Food & drink` and `Social` tags. Entertainment was the
value the Play entry was created with, not a decision.

The App Store secondary slot takes Social Networking, which covers the follower
graph and leaderboard signals without displacing the dish-first positioning. The
Play entry has no secondary category field; its tags already carry that role.

### Listing Locales

The listing locale set is the shipped Transloco locale set:

```text
am ar de en es fr id it pt th tr
```

Both listings are English-only today, which puts a fully localized app behind an
English-only product page in ten languages.

This binds the listing locales to `availableLangs`. Store listings are console
configuration rather than a repository list, so they do not become a fifth entry
in the `Adding A Language` checklist in [[Implementation - Localization]] — but a
language is not finished until both product pages carry it, or the store page
falls back to English while the app does not.

Two mismatches to resolve separately from the listing work, since they are
distribution decisions rather than copy:

- Play targets Croatia and Poland, but `hr` and `pl` are not shipped locales.
- `am`, `ar`, and `pt` ship with no targeted region of their own, and are
  reachable only through Play's `Rest of World` target.

## Listing Copy

The English source, written 21 August 2026 and applied to both stores the same
day — saved on the App Store version page, and submitted for Google's review on
Play, where it replaced a 224-character original that still said `Bite Tribe`.
One body serves both: the App Store description and the Play full description are
both capped at 4000 characters, so they do not diverge. The ten translations
derive from this text and are written out in
[[Implementation - Store Listing Translations]].

### Description

```text
Every food app tells you where to go. BiteTribe tells you what to order.

A Bite is one real dish — photographed by the person who ate it, pinned to the place they ate it, with the price they paid and what they honestly thought.

FIND SOMETHING WORTH EATING
Browse Bites near you, or switch to the map to see what is good around the corner. Search by dish, place or tag. Every Bite carries a photo, a price and a real opinion, so you can decide before you sit down.

SHARE WHAT YOU ATE
Photograph the dish, tag the place, add the price and your rating. Your position and local currency are filled in for you. One dish per Bite — that is what makes it useful to everybody else.

FOLLOW A BITETRAIL
BiteTrails are curated food journeys. Save one as a Bucket List and swipe each Bite off as you try it. Good for a weekend in a new city, and just as good for finally eating your way through your own neighbourhood.

BUILD YOUR TRIBE
Follow the people whose taste you trust and hear about it when they post something new. Reply to their reviews, like what you love, and watch your own contributions add up on the leaderboard.

EAT WELL ANYWHERE
BiteTribe speaks eleven languages and handles local currencies, so a Bite you save in Zurich still makes sense when you read it in Bangkok.

Find it. Try it. Share it.
```

1312 of 4000 characters.

### Promotional Text

App Store only, 134 of 170 characters. It can be changed without shipping a new
version, so it is the field to use for timely messaging.

```text
Every pin on the map is one real dish, photographed by the person who ate it, with the price they paid and what they honestly thought.
```

It is also the web app's meta description and Open Graph description, so the site
and the stores make the same claim. Change it here first, then in
`apps/bite-tribe/src/index.html`. See
[[Implementation - Web Search And Social Metadata]].

### Keywords

App Store only, 97 of 100 characters. Comma-separated with no spaces, because
spaces count. The app name and subtitle are already indexed and are deliberately
not repeated here.

```text
food,dish,eat,foodie,restaurant,dining,menu,nearby,local,travel,review,meal,cuisine,discover,gems
```

### What The Copy Claims, And Why

The opening line is [[ADR-0001 Dish First Product]] in one sentence: every
competitor indexes venues, BiteTribe indexes dishes. It sits in the first two
lines because that is all the App Store shows before the fold.

Every claim maps to a use case marked _Supported today_ in [[SSOT]]:

| Claim                         | Use case                                                        |
| ----------------------------- | --------------------------------------------------------------- |
| Feed, map, search             | [[UC - Discover Bites]], [[UC - Search In BiteTribe]]           |
| Photo, place, price, rating   | [[UC - Create And Maintain Personal Bites]], [[Bite]]           |
| Position and currency prefill | [[UC - Strengthen Location Currency And Data Quality Guidance]] |
| BiteTrails, swipe to tick off | [[UC - Save And Rate BiteTrails Through Bucket Lists]]          |
| Following, replies, likes     | [[UC - Manage Profile And Social Graph]], [[Bite]]              |
| Notifications on new posts    | [[UC - Receive App Notifications And Engagement Updates]]       |
| Leaderboard                   | [[UC - Use Gamification Signals]]                               |
| Eleven languages              | [[Implementation - Localization]]                               |

Four things are **deliberately absent** because they are not in the shipped
build, and naming them would be a promise the app does not keep:

- BiteTribe Pro and subscriptions ([[epic-1124]]).
- Advertising ([[epic-1123]]).
- Buying paid BiteTrails ([[epic-1125]]) — discovering and saving them ships,
  purchasing does not.
- The business app. This listing is the consumer product.

Rule for future edits: a sentence may only survive in this copy while the use
case behind it is still _Supported today_. When the monetization epics land, the
copy is extended rather than corrected.

## Asset Rules

### The Brand Mark Is Current

The mascot is unchanged and stays. Native icons and splash screens are generated
from `apps/bite-tribe/src/logo.svg` through:

```bash
npm run pwa-asset-generator:generate:bite-tribe
npm run ios-asset-generator:generate-ios:bite-tribe
```

The splash is the mascot on a plain background, with no coloured band.

### The Orange Surface Is Not

`apps/bite-tribe/src/theme/variables.scss` now resolves to:

| Token                    | Value                        |
| ------------------------ | ---------------------------- |
| `--ion-color-primary`    | `#4a90d9`                    |
| `--ion-color-secondary`  | `#20201e`                    |
| `--ion-color-tertiary`   | `#f1f1f1`                    |
| `--ion-background-color` | `#fff` light, `#1a1c22` dark |
| `--ion-font-family`      | Outfit                       |

`$PRIMARY_ORANGE` (`#fec56b`) survives only as `--bite-tribe-color`, and is
consumed in exactly three places: the star-rating fill and two SVG fills in the
restaurant and bite-place components. It is a rating accent, not the brand
surface.

Consequence: **every captured asset currently in the stores predates this
palette and must be recaptured, not merely resized.** That covered the Play
feature graphic, whose orange band and orange lockup matched no surface in the
app, and both Play phone screenshots, which showed orange app chrome. Both were
replaced on 22 August 2026 and no stale-palette asset remains on either store.

### Capture Rules

- Capture against the current theme. A screenshot showing `#fec56b` as a header,
  button, or background colour is stale by definition.
- Capture from seeded, realistic data. An empty account is not a product page.
- **Shoot one theme, and shoot dark.** This rule previously read "cover both
  light and dark, since the app ships both", which is not achievable and kept
  regenerating a to-do that could never be done: a store listing shows **one**
  set of screenshots to everyone, so light frames cannot be served to
  light-theme users. The app follows the system theme - `html.dark` plus
  `@media (prefers-color-scheme: dark)` in `variables.scss` - so a light-mode
  user's first launch does not match the listing, and that is accepted. Dark
  wins because the dish photography is the product and it reads far better
  against `#1a1c22` than against a light ground. If the asset library ever holds
  light frames, they are reference material, not listing candidates.
- Keep the sources in the SSOT graph next to this page, so a re-shoot starts from
  the previous framing rather than from scratch. They are in
  `ssot/assets/store-listing/phone-6.9/`.

### The Captured Set

Five frames, shot 22 August 2026 on an iPhone 16 Pro simulator at
1320 x 2868 against the **production** Firebase project, so every dish, review
and profile is real content rather than a fixture.

| #   | File                 | Shows                                                        |
| --- | -------------------- | ------------------------------------------------------------ |
| 1   | `01-home-feed.png`   | The Bites feed with search, sitemap and distance filters     |
| 2   | `02-bitemap.png`     | The map view, clustered pins over Istanbul                   |
| 3   | `03-bite-detail.png` | One Bite: photo, author, stars, price, place and distance    |
| 4   | `04-bucket-list.png` | A BiteTrail saved as a bucket list, with its Bites           |
| 5   | `05-profile.png`     | A profile: follower counts, visited-country flags, own Bites |

The file numbering is capture order, not store order. What matters is that the
App Store uses only the **first three** on install sheets, so those three have to
carry the pitch alone: what one Bite contains, where the Bites are, and what the
app is. `03-bite-detail` is the frame that shows a price and a rating, which is
the claim the description opens with, so it must not sit in the tail.

As uploaded on 22 August 2026:

| Store     | Order                                        |
| --------- | -------------------------------------------- |
| App Store | bite detail, map, feed, bucket list, profile |
| Play      | feed, map, bite detail, profile, bucket list |

The two differ because each console orders by how its upload path happened to
land, and each was then corrected only as far as the first three required. They
do not need to match; the constraint is that the bite detail is above the fold
on both.

The frames are dark-theme throughout, **by decision on 30 August 2026**, and no
light-theme pass is outstanding. See the capture rule above for why one set can
only be one theme.

**The framing is intentional, not a defect.** In frame 1 the first card is
clipped by the filter row, and the scroll-to-top control and `Create Bite`
button overlap the second card's restaurant name. That was raised as something
to fix in a re-shoot and rejected by the maintainer: it reads as a live app mid-
scroll rather than a staged render, which is the impression the set is meant to
give. **Do not "fix" it.** A future re-shoot should reproduce it.

Prod content means real people appear. Frame 3 shows another user's Bite, used
with that creator's consent; frames 4 and 5 are the maintainer's own account.
A re-shoot inherits that constraint — consent is per-person, not per-set.

### The iPad 13-Inch Set

Five frames, shot 31 August 2026 on an **iPad Pro 13-inch (M5) simulator, iOS
26.2**, at 2064 x 2752 against the **production** Firebase project. Sources in
`ssot/assets/store-listing/ipad-13/`. Uploaded the same day; Apple confirmed it
serves the 13-inch set to every iPad display size.

| #   | File                            | Shows                                                     |
| --- | ------------------------------- | --------------------------------------------------------- |
| 1   | `01-home-feed.png`              | Two-column Bites feed with real distances from Cologne    |
| 2   | `02-search-map-switzerland.png` | Country search, map view, clustered pins over Switzerland |
| 3   | `03-restaurant-china-wok.png`   | China Wok: storefront, 4.8 from 26 ratings, tags, map     |
| 4   | `04-restaurant-menu.png`        | The China Wok menu, categories with prices                |
| 5   | `05-start-page.png`             | The logged-out start page                                 |

Uploaded in the order menu, restaurant, feed, start page, map. Apple uses only
the first three on install sheets, which puts prices and then a rated
restaurant above the fold - the same constraint the phone set is held to.

Two things about this set that a re-shoot should know:

- **The location is set, not real.** A simulator reports no location, so the
  feed shows a warning banner and `-` for every distance. `xcrun simctl
location <udid> set 50.9375,6.9603` puts the device in Cologne and the
  distances become real. The commands are in
  [[Implementation - iOS Simulator Testing]].
- **The `Verify your email address` banner is in every signed-in frame**,
  because the capture account is unverified. **Kept by decision on 31 August
  2026**, on the same reasoning as the phone set's mid-scroll framing: it reads
  as a real screen rather than a staged one. Do not "fix" it in a re-shoot.

The set exists because App Store Connect **enforces** the 13-inch requirement:
`Add for Review` failed with `You must upload a screenshot for 13-inch iPad
displays`. That answers the question this page previously recorded as unknown.
Whether BiteTribe should claim iPad support at all is a separate and still-open
decision, tracked as
[#1451](https://github.com/muhammedgaygisiz/travellers-apps/issues/1451).

### Capturing Prod Content Needs A Simulator App Check Provider

A production build points at the production Firebase project, where App Check is
enforced on Authentication, Firestore and Storage. On iOS the provider is App
Attest, and **App Attest has no simulator implementation** — no token is ever
issued, so sign-in fails with a generic `Something went wrong` that says nothing
about attestation. Without a fix there is no way to shoot prod content on a
simulator at all.

`BiteTribeAppCheckProviderFactory` in
`apps/bite-tribe-ios/ios/App/App/AppDelegate.swift` returns
`AppCheckDebugProvider` under `#if targetEnvironment(simulator)` and
`AppAttestProvider` otherwise. The branch is resolved at compile time, and store
and TestFlight builds are always compiled for a device, so the debug provider
cannot reach a release binary even by misconfiguration.

The build, boot and token-registration commands are in
[[Implementation - iOS Simulator Testing]].

The provider emits a token that has to be registered in the Firebase console
before it works. That registration is a **standing App Check bypass for whoever
holds the token**, so it is issued per capture session and revoked afterwards —
the token used for this set was deleted on 22 August 2026. It joins the rotation
list in [issue #1177](https://github.com/muhammedgaygisiz/travellers-apps/issues/1177).

Two things this makes explicit that were previously only implicit:

- `npx nx build bite-tribe` is a **production** build. `defaultConfiguration` on
  the `bite-tribe` build target is `production`, so the bare command strips
  `NX_APP_BITE_TRIBE_IS_DEV` and the debug token by way of `DEV_ONLY_ENV_KEYS`.
- A development build is not an alternative here. It routes at the local
  emulators, so it cannot show prod content no matter how App Check is answered.

### Play Needs Padding, Not A Re-Shoot

Play requires exactly 16:9 or 9:16. The 6.9" master is 1320 x 2868, which is
neither, so Play rejects it. Padding to the nearest exact 9:16 on the dark
background token keeps one capture serving both stores:

```bash
sips -p 2880 1620 --padColor 1A1C22 01-home-feed.png
```

1620 x 2880 is exact — `1620 * 16 == 2880 * 9` — and the pad colour is
`--ion-background-color` dark, so the added bars are invisible against the
frames' own background. At 1620 px on the short side the set also clears Play's
1080 px promotion threshold.

Do not crop to reach the ratio. Cropping a 6.9" master loses status bar or tab
bar and makes the two stores show different framing of the same screen.

### The Feature Graphic Was A Recolour, Not A Re-Shoot

Play's 1024 x 500 feature graphic is the one asset with a real design source: a
Figma frame, exported to SVG. `ssot/assets/store-listing/feature-graphic/` holds
the untouched export as `feature-graphic-original.svg`, the recoloured
`feature-graphic.svg`, the 1024 x 500 `feature-graphic.png` that is live, and
`photo-ojja.png`.

The export made the recolour surgical, because the whole orange surface is one
two-stop linear gradient rather than painted artwork. Three edits:

| Element              | From                  | To                    |
| -------------------- | --------------------- | --------------------- |
| Gradient stop 1      | `#FEC56B` @ 0 opacity | `#1A1C22` @ 0 opacity |
| Gradient stop 2      | `#F6C67A`             | `#1A1C22`             |
| Wordmark and tagline | `#55422A`             | `#F1F1F1`             |

Plus an opaque `#1A1C22` rect behind everything: the photo rect starts at
`x=130`, so the leftmost 130 px had no fill of its own once the overlay stopped
being opaque.

**The mascot is not touched.** All twelve `#55422A` strokes and the `#CE8B3D`,
`#F0B967`, `#825534` and `#D36127` fills are exactly as exported, per _The Brand
Mark Is Current_ above. It reads better against the dark ground than it did
against the tan, where its own body colour was nearly the same value and the
shape was carried entirely by its outline.

The wordmark and tagline are outlined paths — the export has no `<text>` element
— but each is a single path with a single fill, so recolouring them needed no
type work. Re-setting them would mean Outfit, the app's `--ion-font-family`.

Figma compressed the fade between ground and photo into 2% of the gradient
length, which a tan ground needs or the two turn to mud. A dark ground does not,
so the transition was widened to roughly 6%. That is the only change beyond
colour, and it is why the offsets differ from the original export.

Export is reproducible, and pins the output to exactly 1024 x 500:

```bash
npx playwright screenshot --viewport-size=1024,500 \
  "file://$PWD/feature-graphic.svg" feature-graphic.png
```

`qlmanage -t` also rasterizes SVG and needs no dependency, but it renders into a
square canvas and does not preserve the 1024 x 500 aspect. Do not use it to
produce the asset.

The photograph is a dish from the maintainer's own Bites, so the asset carries
no third-party image licence. Recorded because the graphic predates the graph
and its provenance was written down nowhere.

### Uploading Them Is Not Symmetrical

Both consoles hide the screenshot upload behind something other than the obvious
control, in different ways. Recorded because both cost a failed attempt.

**App Store Connect.** The version page's iPhone tab exposes only the **6.5"**
slot. Dropping a 1320 x 2868 master there is rejected with a dimension list that
names only 6.5" sizes, which reads as though the master is wrong. It is not —
6.9" has no slot on that page at all. Use **View All Sizes in Media Manager →
iPhone 6.9" Display**. Once it is filled, the 6.5" slot on the version page
switches to `Using 6.9" Display` and scales the frames itself, so the larger
master is the only one that ever needs capturing.

Media Manager writes on upload. The version page's **Save** stays disabled
afterwards because there is nothing left unsaved, which looks like a failed
upload and is not.

Reordering in Media Manager is HTML5 drag-and-drop and has no keyboard or button
equivalent, so it is a manual step.

**Google Play.** The store listing page carries no file input until **Add
assets** opens the asset library; the library's own **Upload** is what creates
one. Files land in the library first, are selected there, and only reach the
slot on **Add** — a two-step the App Store does not have. Each tile in the slot
carries a trash and a move control on hover, so ordering and removal need no
drag.

Saving stages the listing in **Publishing overview**. Nothing is live, and no
review has started, until **Submit changes for review** is used there. Confirmed
by doing it on 30 August 2026: saving the ten translations produced the dialog
"Your change has been saved. To send it to Google for review, go to Publishing
overview", and the ten changes then sat under "Changes not yet submitted for
review".

**A correction, kept because the wrong version was written down and acted on.**
This page briefly claimed the opposite - that managed publishing is off, so a
save publishes by itself and no send-for-review step exists. That was wrong. It
came from finding Publishing overview empty and the recent listing submissions
already published, and inferring automatic submission from the absence of a
queue. The real explanation is that those changes had already been submitted by
hand, so nothing was left pending. **An empty queue is not evidence of automatic
submission.**

What managed publishing actually controls is the other end: with it **off**,
changes go live as soon as Google approves them; with it **on**, approved changes
wait for you to release them. Either way the submission itself is manual.

Play also runs pre-submission checks - "Running quick checks for commonly found
issues", quoted as up to 14 minutes - and holds the submission until they pass.
Budget for that when a listing change is on the critical path.

## Current State

First inventoried on 21 August 2026 and kept current since. The rows below carry
state through 31 August 2026, the day both stores were submitted.

### Google Play

The default listing is live and has been since 8 February 2026. There is one
listing and no custom listings. It was English-only until 30 August 2026, when
submission **51** published the listing along with the ten translations in
[[Implementation - Store Listing Translations]].

| Slot                  | State                                 |
| --------------------- | ------------------------------------- |
| App name              | `BiteTribe`, 9 / 30                   |
| Short description     | `Find it. Try it. Share it.`, 26 / 80 |
| Full description      | 1307 / 4000, live                     |
| App icon              | present                               |
| Feature graphic       | present, current palette              |
| Phone screenshots     | 5 of 8, current palette               |
| 7-inch tablet         | none                                  |
| 10-inch tablet        | none                                  |
| Chromebook, video, XR | none                                  |
| Website, phone number | empty                                 |

The two stale-palette screenshots were removed and the five current ones added on
22 August 2026, and they are **published**. Five at 1620 px clears Play's
promotion threshold, which the previous two did not.

Submission activity, read on 30 August 2026, records the listing changes going
out on their own: submission **49** on 21 August and submission **50** on 23
August, both `Store Listing`, both `Published`, then **51** on 30 August carrying
the translations. There was never a draft waiting for anyone.

Build 96 was promoted from Open Testing to **Production on 31 August 2026**, at
100% rollout across all 177 countries and regions, and is in review. Nothing in
the listing was outstanding at that point. See [[Current State - Release State]].

The feature graphic was recoloured to the current palette the same day, so no
stale-palette asset remains on either store.

### App Store Connect

**Submitted 31 August 2026 and `Waiting for Review`**, with up to 48 hours quoted.
The version was corrected from `1.0` to `1.0.1` so it matches the binary, and the
App Review sign-in and contact fields were filled — they had been entirely empty,
which for a login-gated app is the most common rejection there is. See
[[Current State - Release State]] for the submission narrative.

| Slot                                    | State                                                                                                     |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Name, subtitle                          | set                                                                                                       |
| Age rating                              | set, 13+ - was 18+                                                                                        |
| Screenshots, iPhone                     | 5 of 10, 6.9", current                                                                                    |
| Screenshots, iPad                       | 5 of 10, 13", captured and uploaded 31 Aug 2026                                                           |
| App previews                            | none                                                                                                      |
| Description, promotional text, keywords | set                                                                                                       |
| Support URL, marketing URL, copyright   | support URL and copyright **set**, marketing URL blank pending [[Implementation - Social Media Channels]] |
| Primary category                        | Food & Drink                                                                                              |
| App Privacy                             | published                                                                                                 |
| Pricing, availability                   | free, all 175 regions                                                                                     |
| Content Rights                          | declared                                                                                                  |
| Build                                   | 96 (1.0.1), attached 31 Aug 2026                                                                          |

TestFlight is in good shape: internal and external groups exist, and the beta
description, feedback email and reviewer sign-in are all filled. It carried build
94 (1.0.1) at the 21 August inventory; builds 95 and 96 have reached it since, the
latter through Transporter on 30 August 2026. The beta description seeded the App
Store description, which is now set in the table above.

## Declarations

Play's ten app-content declarations are all complete. **Apple's are complete
too**: the nutrition labels were published on 21 August 2026 and the age-rating
questionnaire was corrected and saved on 30 August 2026. This paragraph read
"Apple's equivalents are not started" until then, while the subsection directly
below it recorded the labels as published - a contradiction inside one page, and
the reason a reader trusting the summary would have re-done finished work.

| Declaration      | Value                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------- |
| Privacy policy   | `https://bite-tribe.web.app/privacy`                                                      |
| Account deletion | `https://bite-tribe.web.app/account-deletion`                                             |
| Content rating   | 12+ / Teen                                                                                |
| Target age group | 18 and over - now the outlier, see below                                                  |
| Ads              | none in this build                                                                        |
| Data shared      | none                                                                                      |
| Data collected   | name, email, user IDs, precise location, photos, crash logs, app interactions, device IDs |
| Account creation | username and password, and OAuth                                                          |
| Security         | encrypted in transit                                                                      |

The Apple nutrition labels are answered from this same list, so the two stores
describe one set of data flows. Revisit both when the AdMob epic
[[epic-1123]] lands, since `Ads` becomes true at that point.

### The Age Rating Was Over-Declared

Corrected on 30 August 2026, from **18+ to 13+**, after reading the questionnaire
against the codebase rather than against itself.

| Rating surface     | Before                          | After                             |
| ------------------ | ------------------------------- | --------------------------------- |
| Main rating        | 18+, 173 countries or regions   | **13+**, 171 countries or regions |
| Second tier        | -                               | 16+, 2 countries or regions       |
| Brazil             | A16                             | A16                               |
| Korea              | 19+                             | **15+**                           |
| Pre-iOS-26 devices | 17+ global, regional exceptions | **12+** global                    |

Five answers changed. Two were new questions Apple added and nobody had answered,
which is what blocked submission; three were pre-existing and wrong.

| Answer                         | Was      | Now            | Evidence                                                                                                                                                                             |
| ------------------------------ | -------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Social Media                   | blank    | **Yes**        | A discovery feed that spreads user Bites to many users is exactly Apple's definition. Unanswered questions block `Next`, so this was the actual submission blocker                   |
| Social Media Disabled Under 13 | blank    | **No**         | The app calls no Declared Age Range API and does no age assurance, so under-13 users are not handled specially. Answering yes would have been a claim about code that does not exist |
| Advertising                    | Yes      | **No**         | No AdMob dependency in `package.json`, no ad code in `libs/` or `apps/`, and the Declarations table above already says `Ads: none in this build`                                     |
| Messaging and Chat             | Yes      | **No**         | No messaging route exists. The only conversation surface is the review thread under a Bite, which is public user-generated content and is already declared separately                |
| Alcohol, Tobacco, or Drug Use  | Frequent | **Infrequent** | **This was the 18+ driver.** Correcting Advertising and Messaging alone left the calculated rating at 18+; only this moved it                                                        |

The alcohol answer is the judgement call, so it is worth stating the reasoning
rather than just the result. References do exist - restaurant menus list drinks
and a Bite can be of a beer - but Apple defines Frequent as content users
_regularly_ encounter, and a dish-photo feed is not that. Infrequent, "users
will rarely encounter this content", is the honest reading. It is also what Play
concluded independently: Play rates the same product 12+ / Teen.

Availability improved as a side effect. The restricted-countries warning went
from Afghanistan and Morocco, **plus** Iraq, Libya, Maldives, Saudi Arabia and
the United Arab Emirates if the category is Entertainment, Lifestyle or Games,
**plus** Brazil if the category is Games, down to Afghanistan and Morocco alone.

**The lesson is that a declaration is a claim about the code and should be
checked against it.** Three of these had been sitting in the console asserting
features the app has never had, and the cost was not abstract: 18+ on a
restaurant-discovery app is a reach penalty on every store surface that filters
by age.

**One inconsistency is left, and it now points the other way.** Play's
`Target age group` is still declared as 18 and over, which was presumably set to
match the old Apple 18+. With Apple at 13+ and Play's own content rating at
12+ / Teen, that Play answer is the odd one out and should be revisited in the
console.

### Apple Nutrition Labels

Completed and **published** on 21 August 2026. Nine data types, every one
**linked to the user's identity** and **none used for tracking**, with the Play
equivalent alongside:

| Apple category | Type                | Purpose                      | Play equivalent     |
| -------------- | ------------------- | ---------------------------- | ------------------- |
| Contact Info   | Name                | App Functionality            | Name                |
| Contact Info   | Email Address       | App Functionality            | Email address       |
| Location       | Precise Location    | App Functionality            | Precise location    |
| User Content   | Photos or Videos    | App Functionality            | Photos              |
| User Content   | Other User Content  | App Functionality            | –                   |
| Identifiers    | User ID             | Analytics, App Functionality | User IDs            |
| Identifiers    | Device ID           | App Functionality            | Device or other IDs |
| Usage Data     | Product Interaction | Analytics                    | App interactions    |
| Diagnostics    | Crash Data          | Analytics                    | Crash logs          |

Three answers that needed evidence rather than assumption:

- **Linked to identity — yes, for everything.**
  `setupAnalyticsAndCrashlytics` in
  `libs/common/ta-firestore/src/lib/auth.service.ts` calls
  `FirebaseAnalytics.setUserId` and `FirebaseCrashlytics.setUserId` with the
  Firebase `uid`. Analytics and crash data would otherwise have been declared
  unlinked, which is the common default and would have been wrong here.
- **Tracking — no, for everything.** No AdMob, no ATT usage, and no
  `NSUserTrackingUsageDescription` in `Info.plist`. Revisit with
  [[epic-1123]]: requesting the IDFA forces Device ID to be declared as used
  for tracking.
- **Search History — not declared.** `search_performed` in
  [[Implementation - Analytics Events]] carries no parameters, so the query text
  never leaves the device as analytics.

`Other User Content` has no Play counterpart because Play's taxonomy has no
generic user-generated-content type beyond photos, messages and files. Bites
carry review text, ratings, prices and place names, which Apple expects under
that heading. The divergence is a taxonomy difference, not an inconsistency.

`Purchases` is left undeclared on both stores: paid BiteTrails are
[[epic-1125]] and are not in the shipped build.

The Privacy Policy URL on the App Privacy page is set to the same
`https://bite-tribe.web.app/privacy` that Play carries.

`Diagnostics` is deliberately not declared alongside `Crash logs`. The workspace
ships `@capacitor-firebase/crashlytics` and no Performance Monitoring SDK, so
crash logs cover what is actually collected.

### Name Was Missing

Corrected on 21 August 2026 and submitted for Google's review. `Name` was
undeclared while the app collects a display name — `claimDisplayName`,
`/users/{uid}.displayName`, shown publicly on profiles and Bites — and takes one
from Google or Apple sign-in.

Declared as collected, not shared, not ephemeral, **optional**, for app
functionality and account management. Optional because the display-name control
in the onboarding identity step carries no `Validators.required`, so a user can
finish onboarding without one.

An under-declaration is the direction that carries policy risk: the app was
collecting a data type the store listing did not name.

### Account Creation Is Correctly Declared

Play's account-creation question has six options, and both `Username and
password` and `OAuth` are selected. That matches the code — `signInWithGoogle`
and `signInWithApple` in `libs/common/ta-firestore/src/lib/auth.service.ts`, with
buttons on the login page — and it matches the privacy policy, which names
Google and Apple sign-in.

Verified against the prod Firebase project rather than the code alone: all three
providers are enabled, and real accounts exist with Google and with Apple
provider links, including an Apple private-relay address.

Recorded because the option list runs past the fold in the console, and reading
only the visible rows makes it look as though the app declares
password-only sign-in.

### Data Deletion Is Two Questions

The summary row collapses two answers, which makes the second look stale:

- Account deletion — provided, with the URL above.
- "Do you provide a way for users to request that some or all of their data is
  deleted, **without requiring them to delete their account**?" — answered No.

The second answer is currently accurate, but only because no page backs it.
Users can already delete individual Bites, delete bucket lists, and remove Bites
from bucket lists without touching their account, which would justify a Yes.
Selecting Yes makes a **Delete data URL** mandatory, and Google requires that
page to name the app, spell out the steps to request deletion, and list which
data is deleted or kept with any retention period.

Publishing such a page — `/account-deletion` is the template — is what turns
this answer into a Yes. Until then, leaving it at No is the honest answer.

Both public URLs render, but a cold load of the privacy policy can hit the App
Check gate and show the security-check screen first. A store reviewer opening
that link from a fresh browser can see it, which makes it a review risk rather
than a cosmetic one.

## What The Listings Still Need

As of 31 August 2026, the day both stores were submitted, in the order they gated
that submission. Struck-through rows are closed and kept as a record.

| Gap                             | Store | Note                                                            |
| ------------------------------- | ----- | --------------------------------------------------------------- |
| ~~Send the listing for review~~ | Play  | **Done** 30 Aug 2026, submission 51. Ten translations published |
| ~~Support URL~~                 | Apple | **Done** 30 Aug 2026, `https://bite-tribe.web.app/support`      |
| 7-inch and 10-inch screenshots  | Play  | **Deferred** until the app is run on a tablet                   |
| ~~Light-theme captures~~        | Both  | **Not a task.** One listing, one theme; dark by decision        |
| Listing translations            | Both  | **Done.** Play 10 submitted, Apple 9 saved; no Amharic on Apple |
| App previews                    | Apple | Optional, none captured                                         |
| ~~Screenshots 6 to 10~~         | Apple | **Accepted** 31 Aug 2026. Five is sufficient; Apple requires 1  |
| ~~Build attachment~~            | Apple | **Done** 31 Aug 2026, build 96                                  |
| ~~13-inch iPad screenshots~~    | Apple | **Was a hard blocker.** Closed 31 Aug 2026, five frames         |

Play's tablet slots carry a required asterisk but do **not** gate submission:
with both empty, Publishing overview still reports `Your changes can now be sent
for review`. Treat them as a quality gap, not a blocker.

Screenshot reordering on Apple is manual by nature — Media Manager offers only
drag-and-drop — and was done by hand on 22 August to bring the bite detail to
the front.

## The Support URL Is A Page, Not An Address

Apple's own help text for the field reads: "A URL with support information for your app. This appears on your app's product page once you release your app on the App Store." So a provisioned mailbox does not satisfy it. The field takes an `http(s)` URL, Apple publishes that link publicly on the product page, and a `mailto:` is not accepted there.

The app therefore serves its own page at **`/support`**, built on 30 August 2026 in the same shape as `/privacy` and `/account-deletion`: public, reachable without signing in - which matters, because someone who cannot sign in is exactly the person who needs it - and localized into all eleven shipped languages rather than English-only.

| Property  | Value                                                        |
| --------- | ------------------------------------------------------------ |
| URL       | `https://bite-tribe.web.app/support`                         |
| Route     | `PATH.SUPPORT`, in `libs/bite-tribe/shell/src/lib/routes.ts` |
| Component | `libs/bite-tribe/support`                                    |
| Contact   | `support@bitetribe.app`, behind a click-to-reveal control    |

The contact address sits behind the reveal control for the same reason it does on the other two public pages: it keeps the address out of the page source for scrapers while still being one tap from a reviewer. The page also links to the privacy policy and the account-deletion page, so a reviewer arriving at the Support URL first can reach both legal surfaces from it.

**Set the field only after the page is deployed.** Apple does not check the URL
at the moment it is typed, but a Support URL that 404s during review is a
rejection with no upside. Done in that order on 30 August 2026: the page
deployed with the merge, was confirmed to render, and only then was the field
saved.

### Copyright Is 2025, Not 2026

Set to **`2025 Muhammed Gaygisiz`** on 30 August 2026.

Apple's help text for the field is specific: "The name of the person or entity
that owns the exclusive rights to your app, preceded by the year the rights were
obtained." That is the year the work was created, not the year it is submitted,
and the two are a year apart here.

The year comes from the repository rather than from memory. BiteTribe's first
commit is **28 April 2025** (`chore: cleanup, initialize tribe bite app shell`).
The monorepo itself goes back to 19 May 2022, but that is the workspace, which
began as the other app on the same App Store Connect account - so 2022 would
attribute BiteTribe's rights to work that is not BiteTribe.

The entity is the legal entity already on the account. `BiteTribe` was rejected
as the rights holder because it is a product name with no company behind it, and
naming it would attribute the rights to something that does not exist in law.

**The in-app footers are a separate thing and are not wrong.** The privacy
policy, account-deletion and support pages render the current year by the
ordinary convention for a website footer. Do not "fix" either one to match the
other: the store field is a legal attribution of authorship, the footer is a
notice on a web page.

### The Public Pages Sit Behind The App Check Gate

Confirmed on 30 August 2026, and it is the same defect this page already noted
for the privacy policy - but it matters more now, because the Support URL is a
link **Apple publishes on the product page** and invites a reviewer to click.

A cold load of `/support` from an automated browser rendered the enforced-mode
App Check gate instead of the page: "Extra security check needed. BiteTribe
couldn't verify this device with its security check." The same URL in an
ordinary Chrome profile rendered the page in full. That matches the Run 7
methodology note in [[Current State - Release Candidate Test Charter]]: an
instrumented browser scores badly with reCAPTCHA Enterprise, and a bad score
produces an App Check refusal.

So this is not a broken deploy, and a normal reviewer will most likely see the
page. The residual risk is that **reCAPTCHA Enterprise scores a browser, not a
person**, and a reviewer on a fresh profile with no history, a VPN, or an
automated pre-check is exactly the low-reputation shape that scores badly. The
gate is all-or-nothing: it blocks the router outlet, so it takes down the three
pages the stores require to be publicly reachable along with the rest of the app.

Worth considering separately from the listing work: the privacy policy, the
account-deletion page and the support page carry no user data and read nothing
from Firebase, so gating them on device attestation buys no protection and costs
a store-review risk. Exempting those three routes from the startup gate would
remove the risk outright.

## The DSA Trader Decision

Declared **non-trader** on 30 August 2026, at account level, covering the 27 EU
territories.

Two things this page previously said about the DSA were wrong, and both mattered
enough to change the decision, so they are corrected here rather than quietly
overwritten.

**"Apple removes apps from the EU App Store without it" is about not declaring
at all, not about declaring non-trader.** Apple requires a declaration either
way - "Even if you don't distribute apps in the EU, you'll still need to declare
a trader status." Declaring non-trader keeps the app in the EU. What happens is a
disclosure: "If you're not a trader, consumers in the EU will be informed that
consumer rights stemming from applicable consumer protection laws won't apply to
contracts between you and them." The removal risk attaches to leaving the field
undeclared, which is what the red banner was warning about.

**Trader status does not force a home address into public view.** For an
individual membership Apple asks for "Address **or P.O. Box**", with a receipt or
bill proving association with the alternate address. So the choice was never
"publish where you live or lose the EU".

### Why non-trader is the accurate answer today

Apple's stated factors, against the app as it actually is:

| Factor                                                     | BiteTribe                                      |
| ---------------------------------------------------------- | ---------------------------------------------- |
| Revenue from the app - in-app purchase, paid, ad-sponsored | None. Free, no IAP, and no ad code exists      |
| Commercial practices toward consumers                      | None shipped                                   |
| Developed in connection with a trade or profession         | The deciding factor, and the owner's to assess |

Apple's own example is the one that fits: "if you're a hobbyist and you developed
your app with no intention of commercializing it, you may not be considered a
trader."

### What makes it stop being accurate

The monetization epics. Apple names an **ad-sponsored** app explicitly among the
trader factors, so [[epic-1123]] - Stage 1 in [[epic-1121]]'s sequencing, and the
first release that earns anything - is the crossing point, even though no user
pays. [[epic-1122]] is Stage 0 and sells nothing, so the entitlement foundation
can ship with the status unchanged.

The declaration is reversible at two levels, both confirmed present in the
console: account level under Business, and per app under App Information ->
App Store Regulations & Permits -> Digital Services Act.

**Reversible does not mean cheap.** Switching to trader triggers contact details,
two-factor validation of both a phone and an email, uploaded documentation
verifying name and address, payment account details, and then verification by
Apple on their timetable. That is why it is filed as [#1433](https://github.com/muhammedgaygisiz/travellers-apps/issues/1433) under
[[epic-1123]] rather than left as a note: it has to start while that epic is in
progress, not when its build is ready.

This is a compliance self-assessment rather than a configuration value, and
Apple's guidance says to consult a legal advisor where the status is uncertain.

## Tablets Are Deferred, And The iPad Claim Is Untested

Deferred on 30 August 2026: no tablet screenshots for either store until the app
has actually been run on a tablet. Shipping tablet frames before that would be
advertising a layout nobody has seen.

**The claim is already live, though, and that is the part worth acting on.**
`apps/bite-tribe-ios/ios/App/App.xcodeproj/project.pbxproj` sets
`TARGETED_DEVICE_FAMILY = "1,2"`, which is iPhone **and iPad**. So the App Store
listing offers an iPad app today, and the eleven-run platform test pass in
[[Current State - Release Candidate Test Charter]] never touched an iPad - every
iOS run was an iPhone 12 mini.

Two consequences, in order of how much they cost:

- **App Review may test on iPad.** If a reviewer opens it there and the layout
  is broken, that is a rejection, and it is a rejection caused by a build setting
  nobody chose deliberately rather than by the product.
- **Apple's guidance asks for iPad screenshots when an app supports iPad.** The
  version page's `Add for Review` is currently enabled with the iPad slots empty,
  so the console is not enforcing it client-side. Whether submission validation
  enforces it is unverified, and finding out by being rejected is the expensive
  way.

The decision to take is not about screenshots. It is whether BiteTribe supports
iPad at all:

| Option                                | Cost                                                                                  |
| ------------------------------------- | ------------------------------------------------------------------------------------- |
| Set `TARGETED_DEVICE_FAMILY = "1"`    | One build-setting change, a new build, and the iPad question disappears entirely      |
| Keep iPad, test it, shoot iPad frames | An iPad or iPad simulator run against the charter, plus a capture session and uploads |

Play's 7-inch and 10-inch slots are the same shape of question and carry a
required asterisk that does **not** gate submission - Publishing overview reports
`Your changes can now be sent for review` with both empty.

## Blockers Outside The Listing

These are account-level and gate submission regardless of listing completeness:

- ~~The Apple Developer Program License Agreement has been updated and needs the
  Account Holder to accept it.~~ **Done.** Verified in the console on 29 August
  2026: the Free Apps Agreement is `Active`, effective 23 August 2026 to 13 April 2027. The Paid Apps Agreement is still `New` and unsigned, and needs the legal
  entity updated before it can be signed - that gates in-app purchases, so it
  belongs to the monetization epic [[epic-1121]], not to this release.
- ~~Digital Services Act trader status is not provided.~~ **Declared non-trader
  on 30 August 2026.** The Business page now reads "You have completed all
  regulatory requirements at this time", and the Compliance table shows
  `Digital Services Act - 27 Countries or Regions - Active`. No contact
  information is published on the product page. The reasoning is below.
- ~~The new social media age-rating questions are optional until 7 September
  2026, but mandatory for a new app submission, which this is.~~ **Done**, 30
  August 2026. Both were answered as part of the age-rating correction above.
- ~~Play's internal testing track is paused and holds a stale build 58 plus an
  `Untitled release` draft, and issue 1179 needs it live to receive the release
  candidate.~~ **Not a blocker, and the wrong track.** BiteTribe distributes on
  Android through **Open testing**, not internal testing, which is what every
  Android run in [[Current State - Release Candidate Test Charter]] used. Open
  testing is `Active` to unlimited testers across 12 countries; it carried release
  **95 (1.0.1)** when the console was read on 30 August 2026, and build 96 was
  promoted from it to **Production** on 31 August 2026.

  The internal testing track really is paused with a February build 58 and an
  `Untitled release` draft, and that is simply an abandoned track: nothing
  distributes through it and [issue 1179](https://github.com/muhammedgaygisiz/travellers-apps/issues/1179)
  does not need it. Reading its paused state as a release blocker is the mistake
  this bullet used to make - **check which track the product actually ships on
  before reading a track's state as a problem.**

## Related Pages

- [[Implementation - Store Release Steps]]
- [[Implementation - Store Listing Translations]]
- [[Implementation - Web Search And Social Metadata]]
- [[Implementation - Social Media Channels]]
- [[Implementation - Localization]]
- [[Implementation - Release And Build Workflow]]
- [[Current State - Release State]]
- [[Current State - Release Candidate Test Charter]]
- [[ADR-0001 Dish First Product]]
