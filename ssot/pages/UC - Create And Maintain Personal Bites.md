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
- User enters dish details, price, currency, tags, rating, description, and image context.
- User selects a restaurant/place through the picker before saving; direct free-text place entry is no longer the form-level path.
- When a selected restaurant or other location source changes the Bite position, the form map refits its camera to the new marker.
- If no nearby verified restaurant, unverified restaurant, or Google Place is correct, the selector keeps the explicit `Use: "abc"` custom-place fallback.
- When a Bite position is available, the app prefills the currency from that location; the user's preferred currency remains the fallback.
- User can still manually correct the currency before saving.
- The app warns when the entered price looks suspiciously high.
- The app stores the Bite and uploads the image.
- The image upload has three states on the Bite document, and every viewer sees
  the card accordingly: `pending` while it uploads, `uploaded` once the storage
  trigger has the download URL, and `failed` when the upload errored.
- The `pending` message is addressed to the poster only. Their device is the one
  holding the transfer, so they are asked to keep the app open; everyone else
  gets a neutral "loading photo" wait message, because they cannot influence
  someone else's upload.
- A Bite still `pending` ten minutes after it was created reads as `failed` when
  rendered, without its document changing. Neither terminal write is guaranteed:
  the upload promise does not resolve when the device drops offline mid-transfer,
  so the error branch never runs and the storage trigger never fires. The stored
  status stays the source of truth; the age rule only stops a card from claiming
  forever that a photo is on its way. A Bite with no usable creation timestamp
  keeps its stored status, because an abandoned upload cannot be told apart from
  a fresh one.
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
  new attempt. Picking nothing cancels and the Bite stays failed.
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
- Bite API create, edit, upload, and image-path utilities.
- `getCurrencyByPosition`
- `searchNearbyPlaces`
- Shared restaurant selector.
- Bite page suspicious price validation.
- Playwright create-Bite E2E smoke coverage.

## Related Domains

- [[Bite]]
- [[User]]
- [[Restaurant]]
