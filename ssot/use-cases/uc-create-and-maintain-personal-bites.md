# UC - Create And Maintain Personal Bites

## Status

**Level:** L1
Supported today. The create and edit flows, the photo upload states and their retry, and
the five-source position picker are all shipped, including the photo's position offered
again when a Bite is edited, [#1290].

## Goal

Users can create and maintain real dish-level food experiences. This is the core
contribution loop: every account can perform it, and the Bites it produces are what the
rest of the product reads.

## Actors

- **Bite Creator** — creates a Bite, edits it later, and is the only account offered the
  retry on a failed photo upload, because the photo is on their device.

## Flow

- User creates a new Bite.
- Entering the flow is not instant: `new-bite` sits behind `freshSessionGuard`,
  which force-refreshes the ID token over the network, and behind the lazily
  loaded Bite page chunk. The Create Bite button therefore reports the wait
  itself — it locks behind a spinner and the `create-bite-in-progress` label,
  and the page runs the header progress bar — instead of leaving the tap
  unanswered for seconds. This is the same feedback contract sign-in follows;
  see the Entry Feedback Contract in [Implementation - Feature Patterns](../implementation/feature-patterns.md) and
  GitHub issue [#1287].
- A creation session can be seeded with a prefilled draft — a Restaurant menu item, or an existing Bite the user wants to post again — and that draft belongs to that one session. Leaving the form ends the session and drops the draft, so cancelling a menu-derived creation and later starting a generic Bite from Home begins from the normal defaults instead of the abandoned Restaurant and dish. This is the contract GitHub issue [#1233] established, where the cancelled draft survived in the store and prefilled the next, unrelated creation. Only the intentional global defaults — the current location and the preferred currency — carry across sessions, and a Bite that is actually posted keeps the Restaurant and dish its draft supplied.
- A prefilled draft brings no photo of its own, and the form keeps that absence as an empty path rather than an undefined one. Firestore rejects an undefined field, so a menu-derived Bite used to be refused by the backend while the form reported a successful post, and the Bite was lost with nothing to retry. See GitHub issue [#1233].
- `Copy Bite` on another member's listable Bite seeds such a draft for somebody who ate the same dish: dish name, Restaurant, price, currency, `restaurantId` and position come along, and photo, rating, description, tags and `Ate with` start empty, because they belong to the person eating rather than the dish. It is offered to a signed-in reader on a Bite that is not their own and is `uploaded`, in the slot `Edit Bite` takes on the reader's own Bite; the pizza-plus icon on a bucket-listed Bite opens the same draft. The draft names its source as `copiedFrom`, which travels beside the form and never reaches the Bite document. When the source is older than 30 days the form dates the copied price under the price input (`Price from March 2026, still right?`), since a price from last season is only a starting point. Posting the copy ticks the source off as tried out in each of the poster's Bucket Lists that holds it; see [UC - Save And Rate BiteTrails Through Bucket Lists](uc-save-and-rate-bitetrails-through-bucket-lists.md). See GitHub issue [#2018].
- User enters dish details, price, currency, tags, rating, description, and image context.
- User can name the people they ate with in the `Ate with` field: removable chips, picked from the accounts the user follows by display name. Private profiles and accounts the user blocked are not offered, and at ten picked the field closes and says why. A user who follows nobody sees why there is nobody to pick. The field is a form control, so the picks reach the Bite as `taggedUserIds`; in edit, removing a chip removes the uid, and a chip for somebody unfollowed since keeps its name. Which uids survive is the backend's to decide again - see the tagged-user rules on [Bite](../domain/bite.md). See issue [#1917], part of epic [#1915].
- The photo comes from the camera or from the gallery, and on Android the gallery is the system Photo Picker: a surface outside the app that returns the one photo the user selected. It is opened in single-select mode, so the choice is a tap rather than a checkbox and a confirmation, and it raises no permission prompt of any kind. See GitHub issue [#1394].
- `Aus Bild` still works, because the permission that makes it work is asked for elsewhere. Android strips a picked photo's location metadata for a caller without `ACCESS_MEDIA_LOCATION`, so the grant is collected by the onboarding photos step — which explains what the photo's position is for before asking — rather than by the picker. Asking at the picker is what put an OS prompt between the user and their photo, and under "Allow limited access" made them select it twice. See GitHub issue [#1409] and the Media Permission Rule in [Architecture - Capacitor](../architecture/capacitor.md).
- A user who declined keeps every other source: GPS, restaurant, Google, and the map. The modal's photo row then says the photo location is off rather than claiming the photo has no GPS, and offers the way back in place — the OS prompt while one is left, the system settings page once it is not. It never navigates to the app's own Settings page, because leaving the form ends the creation session and drops the draft.
- User selects a restaurant/place through the picker before saving; direct free-text place entry is no longer the form-level path.
- When a selected restaurant or other location source changes the Bite position, the form map refits its camera to the new marker.
- The location section states where the position came from as a text row — `Aus Bild`, `Aus GPS`, `Aus Restaurant`, `Aus Google`, or `Manuell gesetzt` — with an edit action at the end of the row, mirroring the restaurant field. With no position resolved yet, the row is replaced by a full-width `Standort wählen` call to action. This replaced four permanently visible source buttons of equal weight, where the active source was readable only from a check mark on one of them. See GitHub issue [#1266].
- The source is tracked explicitly at every point that writes the position, not inferred by comparing coordinates. Two sources can resolve to the same point, and a restaurant-derived position matched none of the four buttons, so the section used to report no source at all in that case.
- The source is stored on the Bite as `positionSource`, so a Bite reopened for editing still names where its position came from. Bites written before this carry none and are reported as an unknown source rather than being given a guessed one. The field is `null` rather than absent when unknown: the whole form value is handed to Firestore, which rejects an undefined field.
- The photo's position is stored, so a Bite reopened for editing still offers `Aus Bild` and the user can switch back to it. It is the one candidate that needs storing: `compressWithCanvas` strips EXIF before upload, so it cannot be re-derived, while the restaurant and Google positions come back from `restaurantId` and `place`, the device fix stays live, and a manual pick is the position itself. It is stored whatever source the user chose, because a position the user did _not_ pick is exactly the one they may want back.
- It is stored where only the author can read it: `bites/{biteId}/authorPrivate/{uid}`, holding `userId` and `photoPosition`, never a field on the Bite. Every member can read a Bite, so a field there would publish the location the user decided not to use. The form hands it on next to the form value, not as a control, because the form value is what reaches the Bite document. A new photo replaces it, a new photo without a position removes it, and an edit that keeps the photo leaves it alone, so a save before it has loaded cannot delete it. It goes with the Bite (the `deleteBiteAuthorPrivateOnBiteDelete` trigger) and with the account (`deleteOwnAccount`), and the privacy policy says so. See GitHub issue [#1290].
- The edit action opens a modal that lists all five sources over a map showing the resolved candidates as colour-coded markers, one colour per source, with clustering off so nearby candidates stay distinguishable. A source with nothing to offer stays listed but disabled with the reason — no GPS in the photo, no restaurant selected, no Google place selected. Selecting a row or tapping its marker highlights it; the position is applied only on confirm.
- The map shows the source being selected: it moves to the selected candidate and renders that marker larger, so the two routes to the same choice — the list row and the marker — leave the map in the same state. The map used to centre on the device instead and never move again, so with a photo taken 1500 km away the user confirmed a position the map had never shown, and colour alone had to carry the selection where candidates sit metres apart. The camera follows an explicit `focusedGeopointId` on the shared map component rather than a change to the GPS-first default the other maps recenter through. See GitHub issue [#1306].
- `Manuell gesetzt` is a listed source like the others. Selecting its row turns the modal map into a picker seeded from the highlighted candidate. Reopening the modal on a manual position starts in the comparison view, so the manual point can be weighed against the other sources before being edited again.
- The device GPS fix prefills the position and keeps following the device only while the user has not chosen another source. Once a source is chosen, a later fix no longer overwrites it, because the source row would otherwise report a spontaneous switch to GPS.
- If no nearby verified restaurant, unverified restaurant, or Google Place is correct, the selector keeps the explicit `Use: "abc"` custom-place fallback.
- The selector measures its rows from whichever position actually answers the question in front of the user. While the Bite sits where the user is standing, every row carries the single unlabelled distance it always did. Once the Bite's position is more than half a kilometre from the device — the charter's `Posting later` edge case — each row names both origins instead, `0.2 km from the Bite` above `1538.8 km from you`, and the list is ordered by the distance from the Bite. A distance measured from the device cannot discriminate between candidates that are all ~1539 km away, and ordering by it puts a candidate that happens to lie towards the device ahead of the one next door. Rows are measured from the two positions rather than from a precomputed value, so the same numbers hold for local restaurants, Google search results, and nearby Google suggestions, which had three different origins between them. The half-kilometre threshold sits above GPS and EXIF noise and below the spread of a plausible candidate list, so posting on the spot never degrades into two near-identical numbers. See GitHub issue [#1269].
- When a Bite position is available, the app prefills the currency from that location; the user's preferred currency remains the fallback. A prefilled draft that names its own currency - a copied Bite, a menu item, an order line - keeps it, because its price was recorded in that currency: replacing only the currency turned a EUR 15 copy into CHF 15 when the Bite stood in Switzerland. See GitHub issue [#2018].
- User can still manually correct the currency before saving.
- The price field names the currency by its code (`BAM`, `CHF`, `EUR`), never by its full name, so the input keeps a width that can be tapped on a phone; screen readers still hear the full localized name, and the currency selector lists it. The selector opens scrolled to the currency already selected. See GitHub issue [#2035].
- The app warns when the entered price looks suspiciously high.
- The app stores the Bite and uploads the image.
- Connectivity is not a precondition for the photo. A Bite always needs one, the
  user can pick it while offline, and a photo chosen before connectivity was
  lost is still posted with the Bite. It then enters the upload states below and
  can be retried instead of disappearing. The form used to disable its image
  control while offline and waive the photo requirement, which is what lost the
  photo: Angular leaves a disabled control out of a form group's value, so the
  offline form submitted no image at all, no upload started, the document was
  written without an image status, and none of the recovery below could ever
  run. Picking a photo is a local operation, and the upload states now cover a
  transfer that cannot start, so the restriction is gone. See GitHub issue
  [#1229].
- The image upload has three states on the Bite document: `pending` while it
  uploads, `uploaded` once the storage trigger has the download URL, and
  `failed` when the upload errored.
- Only an `uploaded` Bite is listed to anybody but its poster. Until then the
  feed, the searches, the weekly page, bucket lists and the share link leave it
  out for everyone else, and the poster sees it on every surface as usual. See
  issue [#1717] and [Bite](../domain/bite.md).
- The `pending` message is addressed to the poster only. Their device is the one
  holding the transfer, so they are asked to keep the app open. A viewer who
  reaches the Bite some other way - its details page by id - gets a neutral
  "loading photo" wait message instead, because they cannot influence someone
  else's upload.
- On a `failed` Bite the poster is told, between the failure line and the
  retry, that the Bite is visible only to them until the photo is uploaded. It
  is the one place the app says a Bite is unlisted, and it rides on
  `BiteImageStatusComponent`, so the feed card, the details page and the
  profile all carry it. It never shows while the upload is still `pending`.
- The posting device gives up on an upload that reports neither progress, nor
  completion, nor an error for thirty seconds, and records `failed`. A transfer
  that loses connectivity mid-flight is silently retried by the Storage SDK for
  its own ten-minute window, so without this bound the Bite stayed `pending`
  with no error for the user to act on — the offline case from GitHub issue
  [#1229]. Each progress report restarts the clock, so a slow but moving upload is
  never cut short. Offline the `failed` write is queued by Firestore and applies
  to the local cache at once, which is what makes the state visible while the
  device is still disconnected.
- A Bite still `pending` ten minutes after it was created reads as `failed` when
  rendered, without its document changing. This is the backstop for the devices
  that are not doing the upload, and for a posting device that was killed before
  it could record the failure. The stored status stays the source of truth; the
  age rule only stops a card from claiming forever that a photo is on its way. A
  visible `pending` state re-checks its own age every thirty seconds, because
  the Bite that lost its photo is exactly the Bite that stops changing and would
  otherwise never be re-rendered. A Bite with no usable creation timestamp keeps
  its stored status, because an abandoned upload cannot be told apart from a
  fresh one.
  The client writes `failed` itself, because `setBiteImagePathOnUpload` only ever
  runs on a finalized object — without it the card kept telling every viewer
  "uploading, keep the app open" forever. A failed upload shows that state even
  to the poster, whose device still holds the local copy, so a lost photo is
  never passed off as a successful post. See GitHub issue [#1168].
- The poster, and only the poster, is offered a retry on a failed photo: the
  photo lives on their device, so nobody else has anything to send. The retry
  takes one of two flows. When this device still holds the Bite's own local copy
  — found from the Bite id alone, see `findLocalUploadedImage` — it is re-sent
  straight away. Otherwise, for an older Bite or one posted from another device,
  the user picks from the photos saved locally, the same set the gallery shows.
  A started retry puts the document back to `pending`, so every viewer sees the
  new attempt. Picking nothing cancels and the Bite stays failed. Only one
  attempt per Bite runs at a time: a retry started while this device is already
  uploading that Bite's photo — the first upload or an earlier retry — is
  ignored, so a double tap cannot start two transfers. A transfer already
  written off as stalled is the exception: the Storage SDK exposes no way to
  cancel it, so it may still finalize later, and the storage trigger's write
  decides which photo the Bite ends up with.
- The retry is raised as an output by the card and the details page and carried
  out by the owning integration service. Presentational components never reach
  a service themselves: they take inputs and emit outputs, and the smart layer
  decides what happens — including presenting the picker.
- User can post the Bite and stay on the form to add another Bite at the same place. Restaurant, currency, position, and the `Ate with` picks stay; image, dish name, price, rating, description, and tags reset, and the tags of the Bites already posted in that session become suggestions.
- The user's first Bite is celebrated instead of confirmed: a short confetti burst and `Your first Bite is in!` replace the ordinary `Bite created successfully!` toast, on the post path and the add-another path alike, where the burst plays over the form. Whether it is the first is asked before the create, from the profile's `biteCount` when it counts a Bite and otherwise from Firestore for a single Bite of the user's. The store cannot answer: it holds the user's own Bites only once My Bites or My Profile has loaded them. Nothing is stored, so deleting the only Bite and posting again celebrates again, which epic [#1741] accepts. When the answer cannot be told - signed out, or the read failed - the ordinary toast is shown, and a failed create celebrates nothing. See GitHub issue [#1796] and the Celebration Rule in [Implementation - Ionic Patterns](../implementation/ionic-patterns.md).
- Every later Bite is confirmed in sight, touch and sound together: the `Bite created successfully!` toast, its `success` haptic and the `posted` sound arrive at once, on the post path and the add-another path alike. The sound is fired and not awaited, so it never holds up the toast or the navigation. A first Bite plays no `posted` sound because the celebration takes its place and plays the `celebration` sound instead (issue [#1846]), and a failed create or an edit plays none. The phone's silent mode and the `Sounds` setting keep it quiet. See GitHub issue [#1845] and the Sound Rule in [Architecture - Capacitor](../architecture/capacitor.md#sound-rule).
- User can edit the Bite later.
- My Bites shows the total number of the user's Bites as a badge next to its title. It is the total, not the length of the list underneath: a filter narrows the list but never the badge. It is counted the way the profile header counts, from the user document's `biteCount` aggregate raised to the number of loaded Bites when that is higher (`totalBiteCount`), so the two surfaces never report different numbers. The badge is not shown while the Bites are still loading. See GitHub issue [#1783].

## MVP Classification

**[MVP]** — creating a Bite and editing it later, the photo requirement with its three
upload states and the poster-only retry, restaurant and position selection, and the
currency and suspicious-price handling. This is the core contribution loop and all of it
ships today.

**[Secondary]** — offering the photo's position again while editing, [#1290]. Shipped.
Nothing on this page is unimplemented.

## App Store Review Area

Relevant. This is where the camera, photo library and location permissions are exercised
and where their purpose strings have to hold up. On Android the gallery is the system
Photo Picker, which raises no permission prompt of its own, and `ACCESS_MEDIA_LOCATION` is
collected by the onboarding photos step rather than here - see [Architecture - Capacitor](../architecture/capacitor.md)
and GitHub issue [#1409]. Both data types this flow writes are already declared in
[Implementation - Store Declarations](../implementation/store-declarations.md): **Photos or Videos** and **Precise Location**,
each under App Functionality.

## Supported Evidence

- `new-bite`
- `bite/:biteId/edit`
- "Post and add another Bite" action on `new-bite`.
- Playwright "add another" E2E coverage: three Bites posted in one session
  started from Home, and a session started from a menu item whose Restaurant is
  kept for the Bites typed after it.
- Bite API create, edit, upload, and image-path utilities.
- `getCurrencyByPosition`
- `searchNearbyPlaces`
- Shared restaurant selector.
- Bite page suspicious price validation.
- Playwright create-Bite E2E smoke coverage.
- Playwright My Bites count E2E coverage: a Bite posted in the same session raises the title badge by one without a reload. See GitHub issue [#1783].
- Playwright photo-upload-status E2E coverage: the poster-only wait message, the
  failed state and its poster-only retry, the age threshold that leaves the
  document untouched, and a blocked upload driven from the create flow through
  the terminal `failed` write to a successful retry from the local copy.
- Playwright position-source E2E coverage: the location row asserted for the
  Google and restaurant sources, a photo whose GPS EXIF is read into the Bite,
  and both outcomes of a manual pick — cancelled, leaving the row and the
  persisted position untouched, and confirmed, reaching the saved Bite over the
  restaurant position and the device fix it had already resolved. The photo case
  needs its own fixture, `bite-geotagged.jpg`, because the plain one carries no
  EXIF; see `tools/generate-geotagged-fixture.mjs`. The modal's disabled rows and
  marker-tap selection stay on the unit tests in `bite.page.spec.ts`: neither
  writes to the Bite, so an E2E failure there would not be catching data loss.
  See GitHub issues [#1266] and [#1289].

## Related GitHub Scope

- Issues [#1229] and [#1168] made the photo survive being offline and losing connectivity mid-upload: a photo picked offline now enters the `pending`/`uploaded`/`failed` states instead of being silently dropped, and the client writes `failed` itself once an upload stalls.
- Issue [#1717] made the upload state decide who is shown the Bite: only `uploaded` is listed to other people, and the poster of a failed one is told so.
- Issue [#1233] scoped a prefilled creation draft (from a menu item or a repost) to its own session, and fixed the undefined-vs-empty photo path that lost a menu-derived Bite when it had none.
- Issue [#1287] is the Entry Feedback Contract on the Create Bite button - the spinner and header progress bar covering `freshSessionGuard` and the lazy page chunk.
- Issues [#1266], [#1306] and [#1289] redesigned the position-source picker: the single text row with an edit action replacing four always-visible buttons, the modal map following the selected candidate (`focusedGeopointId`), and the modal's disabled rows and marker-tap selection.
- Issue [#1269] added the dual-origin distance labels and Bite-position ordering for the `Posting later` edge case.
- Issue [#1394] moved the Android gallery onto the system Photo Picker, dropping its own permission prompt.
- Issue [#1409] moved the `ACCESS_MEDIA_LOCATION` grant to the onboarding photos step (the Media Permission Rule).
- Issue [#1078] replaced the permissive `/{document=**}` Firestore wildcard with default-deny and per-collection matches, which is what made the author-only photo position of [#1290] possible.
- Issue [#1783] shows the total Bite count as a badge next to the My Bites title, sharing the profile header's count rule.
- Issue [#1796] celebrates the user's first Bite in place of the ordinary creation toast, part of epic [#1741].
- Issue [#1845] plays the `posted` sound with the creation toast, part of epic [#1742].
- Issue [#1846] plays the `celebration` sound with every celebration, the first Bite's included, part of epic [#1742].
- Issue [#1917] added the `Ate with` picker, part of epic [#1915] (tag the people you ate with).
- Issue [#2018] added `Copy Bite` on another member's Bite, the copied-price date, and the automatic Bucket List tick on posting a copy.
- Issue [#2035] made the price field show the currency code, after the Bosnia-Herzegovina convertible mark left the input 0px wide on a phone, and opens the shared currency selector on the selected currency.
- Issue [#1290] stores the photo's position at `bites/{biteId}/authorPrivate/{uid}`, readable by the author alone, so `Aus Bild` is offered again when the Bite is edited. Classified `[Secondary]`.

## Related Domains

- [Bite](../domain/bite.md)
- [User](../domain/user.md)
- [Restaurant](../domain/restaurant.md)

## Related Pages

- [Personas](../product/personas.md) - the audiences this loop serves: Food lover, Traveler, Bite creator
- [Implementation - Feature Patterns](../implementation/feature-patterns.md) - the Entry Feedback Contract
- [Implementation - Ionic Patterns](../implementation/ionic-patterns.md) - the Celebration Rule
- [Architecture - Capacitor](../architecture/capacitor.md) - the Media Permission Rule and the Sound Rule
- [Implementation - Store Declarations](../implementation/store-declarations.md)
- [Current State - Known Issues](../current-state/known-issues.md)

[#1078]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1078
[#1168]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1168
[#1229]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1229
[#1233]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1233
[#1266]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1266
[#1269]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1269
[#1287]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1287
[#1289]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1289
[#1290]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1290
[#1306]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1306
[#1394]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1394
[#1409]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1409
[#1717]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1717
[#1741]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1741
[#1742]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1742
[#1783]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1783
[#1796]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1796
[#1845]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1845
[#1846]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1846
[#1915]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1915
[#1917]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1917
[#2018]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2018
[#2035]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2035
