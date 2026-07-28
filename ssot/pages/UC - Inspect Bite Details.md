# UC - Inspect Bite Details

## Status

Supported today.

## Goal

Users can inspect one Bite deeply enough to decide whether the dish is relevant.

## Actors

- Food lover
- Traveler
- Bite creator

## Current Flow

- User opens a Bite detail page.
- The page shows the food experience in context.
- A public creator profile identifies who shared the Bite.
- The page shows the Bite's distance from the user's current position and converts its price into the user's preferred currency.
- User can share the Bite through the device share sheet, including WhatsApp when available.
- User can open directions to the Bite's place through the platform navigation experience.
- User can save the Bite to an existing bucket list or create a new list for it.
- User can understand creator/profile context, restaurant/place context, image, likes, reviews, and related data.
- While the Bite loads, the share, navigation, and bucket-list actions are
  replaced by skeleton placeholders rather than shown as tappable icons, so the
  user cannot trigger an action against a Bite that is not there yet. The
  first-visit coach marks for those actions are gated on the loaded Bite, so
  they are unaffected. See GitHub issue #1166.
- The header photo reports its upload state exactly as the feed card does: an
  uploading Bite shows the wait message (addressed to the poster, neutral for
  everyone else) and a failed or long-abandoned upload says so, instead of
  leaving an unexplained empty header. Both surfaces render the same
  `bt-bite-image-status` component so they cannot drift. See GitHub issue #1168
  and [[UC - Create And Maintain Personal Bites]] for the status rules.

## Supported Evidence

- `bite/:biteId`
- Bite details page and data-access.
- Like API.
- Review API.
- Playwright E2E coverage of the failed header photo: the reported state, the
  photo that is withheld rather than shown, and the poster's retry falling back
  to the local photo picker when this device holds no copy.

## Related Domains

- [[Bite]]
- [[User]]
- [[Restaurant]]
