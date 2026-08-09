# UC - Create And Maintain Personal Bites

## Status

Supported today.

## Goal

Users can create and maintain real dish-level food experiences.

## Actors

- Bite creator
- Food lover

## Current Flow

- User creates a new Bite.
- A creation session can be seeded with a prefilled draft — a Restaurant menu item, or an existing Bite the user wants to post again — and that draft belongs to that one session. Leaving the form ends the session and drops the draft, so cancelling a menu-derived creation and later starting a generic Bite from Home begins from the normal defaults instead of the abandoned Restaurant and dish. This is the contract GitHub issue #1233 established, where the cancelled draft survived in the store and prefilled the next, unrelated creation. Only the intentional global defaults — the current location and the preferred currency — carry across sessions, and a Bite that is actually posted keeps the Restaurant and dish its draft supplied.
- A prefilled draft brings no photo of its own, and the form keeps that absence as an empty path rather than an undefined one. Firestore rejects an undefined field, so a menu-derived Bite used to be refused by the backend while the form reported a successful post, and the Bite was lost with nothing to retry. See GitHub issue #1233.
- User enters dish details, price, currency, tags, rating, description, and image context.
- User selects a restaurant/place through the picker before saving; direct free-text place entry is no longer the form-level path.
- When a selected restaurant or other location source changes the Bite position, the form map refits its camera to the new marker.
- The location section states where the position came from as a text row — `Aus Bild`, `Aus GPS`, `Aus Restaurant`, `Aus Google`, or `Manuell gesetzt` — with an edit action at the end of the row, mirroring the restaurant field. With no position resolved yet, the row is replaced by a full-width `Standort wählen` call to action. This replaced four permanently visible source buttons of equal weight, where the active source was readable only from a check mark on one of them. See GitHub issue #1266.
- The source is tracked explicitly at every point that writes the position, not inferred by comparing coordinates. Two sources can resolve to the same point, and a restaurant-derived position matched none of the four buttons, so the section used to report no source at all in that case.
- The edit action opens a modal that lists all five sources over a map showing the resolved candidates as colour-coded markers, one colour per source, with clustering off so nearby candidates stay distinguishable. A source with nothing to offer stays listed but disabled with the reason — no GPS in the photo, no restaurant selected, no Google place selected. Selecting a row or tapping its marker highlights it; the position is applied only on confirm.
- `Manuell gesetzt` is a listed source like the others. Selecting its row turns the modal map into a picker seeded from the highlighted candidate. Reopening the modal on a manual position starts in the comparison view, so the manual point can be weighed against the other sources before being edited again.
- The device GPS fix prefills the position and keeps following the device only while the user has not chosen another source. Once a source is chosen, a later fix no longer overwrites it, because the source row would otherwise report a spontaneous switch to GPS.
- If no nearby verified restaurant, unverified restaurant, or Google Place is correct, the selector keeps the explicit `Use: "abc"` custom-place fallback.
- When a Bite position is available, the app prefills the currency from that location; the user's preferred currency remains the fallback.
- User can still manually correct the currency before saving.
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
  #1229.
- The image upload has three states on the Bite document, and every viewer sees
  the card accordingly: `pending` while it uploads, `uploaded` once the storage
  trigger has the download URL, and `failed` when the upload errored.
- The `pending` message is addressed to the poster only. Their device is the one
  holding the transfer, so they are asked to keep the app open; everyone else
  gets a neutral "loading photo" wait message, because they cannot influence
  someone else's upload.
- The posting device gives up on an upload that reports neither progress, nor
  completion, nor an error for thirty seconds, and records `failed`. A transfer
  that loses connectivity mid-flight is silently retried by the Storage SDK for
  its own ten-minute window, so without this bound the Bite stayed `pending`
  with no error for the user to act on — the offline case from GitHub issue
  #1229. Each progress report restarts the clock, so a slow but moving upload is
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
  never passed off as a successful post. See GitHub issue #1168.
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
- User can post the Bite and stay on the form to add another Bite at the same place. Restaurant, currency, and position stay; image, dish name, price, rating, description, and tags reset, and the tags of the Bites already posted in that session become suggestions.
- User can edit the Bite later.

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
- Playwright photo-upload-status E2E coverage: the poster-only wait message, the
  failed state and its poster-only retry, the age threshold that leaves the
  document untouched, and a blocked upload driven from the create flow through
  the terminal `failed` write to a successful retry from the local copy.

## Related Domains

- [[Bite]]
- [[User]]
- [[Restaurant]]
