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
- The Bite is the only shareable entity in BiteTribe. The share link, the
  `handleSharedLinkToBite` preview endpoint, and the native `/s/bite/*` deep-link
  registration in the iOS Associated Domains file and the Android App Links
  intent filter exist for Bites alone. Profiles, bucket lists, restaurants, and
  BiteTrails have no share action and no deep link. See [[issue-1190]].
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

## Relative Time Contract

Issue [#1272](https://github.com/muhammedgaygisiz/travellers-apps/issues/1272)
made the page's ages honest. The Bite's age and every review's age render
through the same pipe, so the contract covers both:

- An age is written in the reader's language. It is formatted by
  `Intl.RelativeTimeFormat` against the active Transloco language rather than
  assembled from hardcoded English, which is what put `5 min ago` in the middle
  of an otherwise German page during release-candidate Run 5.
- The abbreviations come from CLDR, so the unit stays readable per language.
  The hand-written pair that shipped before — `min` for minutes and `m` for
  months — was a distinction no translation would have preserved.
- A single unit is shown. The composed forms the old pipe produced, such as
  `2 w 3 d ago`, have no localized equivalent and are gone; the coarser unit is
  enough to judge how fresh a Bite is.
- A timestamp ahead of now is reported as ahead, not as elapsed. Clock skew and
  a bad write both produce one, and rendering it as an age presented a wrong
  reading as a confident one.
- A Bite or review without a timestamp renders nothing. The pipe used to
  default its argument to a hardcoded May 2025 constant, so an absent
  `createdAt` was reported as a real age measured from an arbitrary date —
  missing data shown to the user as data. Anything unparsable renders nothing
  for the same reason.

## Absent Field Contract

The details page renders a Bite whose optional fields are frequently empty, and
the same rule governs all of them: a field with no value contributes nothing —
no placeholder, no separator, no heading of its own. The page is shorter, not
apologetic.

- The place and distance share one line joined by a `·`. The separator belongs
  to the join, so it appears only when both sides do. The distance itself needs
  both ends — the reader's position and the Bite's own — and renders nothing
  when either is missing, rather than falling back to `toMetric`'s `-`. Before
  this, a page that had not loaded a Bite at all still rendered `· -`,
  underneath the skeleton that was correctly saying nothing was there yet.
- The read-only tag list is left out entirely for a Bite with no tags, heading
  included. A "Tags" heading over an empty row announces an absent optional
  field as though something had failed to load, and read-only there is nothing
  the reader could add. The gate sits on the page rather than inside the shared
  `bt-tags-input`, so the component still renders its heading for every caller:
  the condition is a Bite having tags, which is knowledge the page has and the
  component does not.
- This is the same judgement as the profile's dropped "no location"
  placeholder in [[UC - Manage Profile And Social Graph]] and the empty string
  an absent timestamp renders above: BiteTribe does not fill a gap with a
  message about the gap.

## Shared Link Entry Contract

Issue [#1246](https://github.com/muhammedgaygisiz/travellers-apps/issues/1246)
made the recipient of a shared Bite link arrive at that Bite:

- A shared link is opened cold — a new tab, a message, a browser that has never
  run the app in this session. The recipient must end on the Bite. Ending on
  Home or the welcome page is a failure, not a fallback.
- A cold load runs the route guards before the persisted Firebase session has
  been read back, so a signed-in visitor first looks signed out. Nothing decides
  who the visitor is until auth has reported an answer, and that wait is on the
  restoration itself rather than on a fixed delay that can expire early.
- Guards on one route run alongside each other, not in sequence, so the
  onboarding entry gate sees the same unrestored state and waits for the same
  answer. A gate that reads "no user" from a session still loading would send a
  returning user into the assistant and drop the Bite on the way.
- A visitor who really is signed out is sent to sign in, and the requested URL
  is remembered rather than discarded. Signing in, registering, or completing
  first-run onboarding returns them to the Bite they were sent.
- The welcome page and the onboarding gate hand a remembered URL back instead of
  resolving to Home, so a target survives every redirect the entry chain makes.
- A remembered URL lives for the current page only. Reloading or closing the tab
  before signing in abandons it; a target resurfacing in a later session would
  be the more surprising outcome.
- This shares its shape with the tapped-notification contract in
  [[UC - Receive App Notifications And Engagement Updates]]: a target requested
  while the app is still starting, against startup navigation that resolves the
  address a returning user is sent to.

## Unresolvable Bite Contract

Issue [#1232](https://github.com/muhammedgaygisiz/travellers-apps/issues/1232)
gave the page an answer for every way its read can end. It is reachable with a
Bite that cannot be resolved from the local gallery, the home feed, a shared
link, and a tapped notification alike, so the page owns this rather than each
entry point.

- The page never waits forever. Once the read has settled, exactly one of three
  things is true: a Bite is shown, the Bite is reported as gone, or the read is
  reported as failed. A loading skeleton means a read still in flight and
  nothing else.
- A Bite that no longer exists is answered by a blocking alert that cannot be
  dismissed by the backdrop and offers only the way back. Firestore answers a
  read for a deleted document with a successful but empty snapshot, so "the read
  finished and there is no Bite" is the condition, not one particular error.
- A read that failed for its own reasons — a timeout from the retry wrapper, a
  rejected permission, an App Check refusal — says nothing about whether the
  Bite exists, so it is reported separately and offers the read again next to
  the way back.
- A route without a `biteId` is not a failure. Nothing has been asked for, and
  the page stays in its loading state rather than claiming a Bite is missing.
- Every settled read that produced no Bite files a Crashlytics non-fatal
  carrying the Bite id, the branch taken, and where the navigation came from.
  A user who is shown a message cannot report a timeout usefully, and the
  branches are indistinguishable from the outside.
- The Bite is never read straight off the resource in a template.
  `ResourceRef.value()` throws once the read has failed, which aborted the whole
  binding update and left the page unable to report the very failure it had
  detected. Reads go through a guarded accessor instead.

## Supported Evidence

- `bite/:biteId`
- Bite details page and data-access.
- Like API.
- Review API.
- Playwright E2E coverage of the failed header photo: the reported state, the
  photo that is withheld rather than shown, and the poster's retry falling back
  to the local photo picker when this device holds no copy.
- Playwright E2E coverage of the cold shared-link entry:
  `apps/bite-tribe-e2e/src/tests/shared-bite-deep-link.spec.ts` opens
  `/bite/:biteId` as a fresh page load, signed in and signed out.

## Related Domains

- [[Bite]]
- [[User]]
- [[Restaurant]]
