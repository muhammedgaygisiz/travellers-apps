# Architecture - AI

## Purpose

How BiteTribe calls a language model: where the call runs, what leaves the
device, what it costs and how it is limited. There are three AI
features: the generated Bite description of issue [#2030], the dish
explanation on the Bite details page of issue [#2106], and the content check
of issue [#1610] that user-written text passes before another account can
read it. All three follow the shape on this page.

## The Call Runs In A Cloud Function

```text
Create / Edit Bite page        Generate tapped
|
BiteService.descriptionGenerator   (analytics, toasts)
|
BiteDataAccessService.generateDescription
|
callable generateBiteDescription   (App Check, signed-in member)
|  aiUsage/{uid}: one of the day's allowance taken in a transaction
|
Gemini on Vertex AI, global endpoint, structured JSON answer
|
{ status: 'ok', description } | { status: 'limit' } | { status: 'unavailable' }
```

The app never talks to the model. The callable is the only way in, so:

- **No key in the app.** The function authenticates as its own service account
  through Application Default Credentials (`google-auth-library`), and the calls
  are billed on the project's Blaze account. There is no API key to store,
  rotate or leak.
- **The limit cannot be skipped.** It is counted server-side before the model
  is called.
- **The model can be swapped** without an app release: `GEMINI_MODEL` in
  `shared/utils/gemini.ts`.

`generateWithGemini` is the one place that knows Vertex's REST shape. It asks
for `responseMimeType: application/json` with a `responseSchema`, so the answer
is parsed rather than scraped, and any failure - quota, network, a non-JSON or
empty answer - is a `GeminiUnavailableError`.

**A one-word verdict still needs room.** The image and text checks answer a
single category, about a dozen tokens, yet `gemini-3.5-flash-lite` spends part
of `maxOutputTokens` before it writes any. At 20 it stopped at `{"` with
`finishReason: MAX_TOKENS` on every call, so until the fix of 20 November 2026
both checks answered `unavailable` in production: the text check fell back to
the wordlist, and the stored photo check judged nothing ([#2143]). Both
now pass `VERDICT_MAX_OUTPUT_TOKENS` (256), and a `MAX_TOKENS` stop is reported as
the output limit rather than as text that is not JSON. A new structured call sets
its limit from a sampled answer, not from the size of the JSON it expects.

## The Dish Explanation

Issue [#2106]: **Explain me** on the Bite details page explains the dish to a
member who does not know it - what it is, where it comes from and its typical
ingredients - in the member's app language. The rules are `R-1` to `R-7` of
[UC - Inspect Bite Details](../use-cases/uc-inspect-bite-details.md); this
section is how they are built.

```text
Details page          Explain me tapped (member, photo uploaded)
|
DetailsService.explainBite      opens BiteExplanationComponent, analytics
|
BiteExplanationDataAccessService.explainBite
|
callable explainBite   (App Check, signed-in member)
|  bites/{biteId} read; refused while its photo is pending or failed
|  biteExplanations/{biteId}_{language} kept for this dish name? answered, nothing counted
|  aiUsage/{uid}.explanations: one of the day's 20 taken in a transaction
|
Gemini on Vertex AI, structured JSON answer, stored, then answered
|
{ status: 'ok', cached, explanation } | { status: 'unknown', cached } | { status: 'limit' } | { status: 'unavailable' }
```

- **Kept per Bite and language.** `biteExplanations/{biteId}_{language}` holds
  the answer with the dish name it was written for, the model and the time. A
  Bite renamed since gets a new one, which replaces the old document. An
  `unknown` answer is kept too, so a dish the model cannot place is not paid
  for again. `deleteBiteExplanationsOnBiteDelete` removes a Bite's documents
  with the Bite. The collection is server-only, which the Firestore rules
  tests assert.
- **What the model is given:** the Bite's name, its place, city and country,
  and its photo, read from our own bucket by `imagePath` or the download URL.
  Never the creator's description or tags: the answer is shown to every later
  reader in that language, so one user's free text must not steer it.
- **The prompt** (`explanationInstructions`) asks for the dish as it is
  typically made rather than this plate, two short paragraphs and three to six
  typical ingredients, and forbids any allergen or dietary claim. The
  disclaimer under the text is the app's own translated string, not the
  model's.

## The Content Check

Issue [#1610]: text a member publishes is checked before it becomes visible to
another account, and text that fails is refused with a message that says so.
`RD-UR-11` is the decision to check it automatically. `checkContent` in
`shared/moderation/check-content.ts` is the one check, and every surface calls
it on the server:

| Surface                                         | Where it is checked                                       | What a refusal does                                                                               |
| ----------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| A review or reply, created or edited            | the `saveReview` and `editReview` callables               | nothing is written; the app shows `content-refused`                                               |
| A display name                                  | `claimDisplayName`, before the claim                      | nothing is claimed; `display_name_refused`                                                        |
| A profile's real name, city, about and pronouns | the `updateProfileText` callable                          | nothing is written; the app shows `content-refused`                                               |
| A Bite's name, tags and description             | the form's `checkBiteContent`, then `moderateBiteOnWrite` | the form keeps the user and their text; the trigger undoes a write that reached the server anyway |

The Firestore rules refuse a client write of every field in that table except
the Bite's, so the callables are the only way in. A Bite is the exception
because it has to save offline (`RD-QG-1`) and a callable cannot be reached
offline. Its check is therefore in two places: the form asks first whenever it
is online, and `moderateBiteOnWrite` judges every write that changes the
Bite's text, asked first or not. A failed edit gets its previous text back; a
failed new Bite is removed with the operator delete's own steps, since it has
no earlier text. The author is told by a `BITE_CONTENT_REFUSED` push either
way. **The bound accepted for it:** between such a write and the trigger -
seconds - the text is readable by other members. The new-Bite and tagged-user
pushes judge the text themselves, so neither sends it out in that window.

- **Two steps.** A short wordlist of terms that are objectionable in any
  sentence a food app could hold (`objectionable-terms.ts`) refuses the
  unambiguous cases for nothing; what passes it goes to the model, which reads
  the sentence and so tells a slur from a dish and a bad review from abuse, in
  every shipped language. Terms match as whole words after normalising case,
  accents and look-alike digits, never as substrings, and words that are
  ordinary food slang or ordinary in another language are left to the model.
- **What the model is asked.** `moderationInstructions` names the categories
  it may answer - `hate`, `harassment`, `sexual`, `violence`, `self_harm`,
  `illegal` - or `none`, and says what is not objectionable: a dish or
  ingredient that resembles slang, an honest negative review, casual swearing
  that attacks nobody. An answer outside the list reads as `none`.
- **One verdict per text.** A model verdict is kept in the server-only
  `contentChecks/{sha256}` by a hash of the text it judged, never the text, so
  the form's check, the trigger and the pushes pay for the same Bite once.
- **When the model cannot answer, the wordlist's verdict stands.** Refusing
  every post while Vertex is down would take the product offline over an
  outage; publishing what the wordlist passed is the exposure the product had
  before the check. The miss is logged as a warning and nothing is kept.
- **A refusal is recorded** in Cloud Logging under the fixed message
  `content refused`, with the account, the surface, the stage, what the
  trigger did, the field, the verdict and the text cut to 300 characters.
  Cloud Logging rather than a collection by the same decision that made it the
  operator audit trail (epic [#1471]): the query is
  `jsonPayload.message="content refused"`, and the logs expire on their own.
- **Every uploaded photo is checked before it is published.**
  `setBiteImagePathOnUpload` calls `The Image Check` below since [#2139],
  `setUserPhotoUrlOnUpload` since [#2140], which also covers the avatar a new
  account brings from its identity provider, and
  `setRestaurantImagePathOnUpload` and `setBiteTrailImagePathOnUpload` since
  [#2141]. A photo whose check could not run stays unpublished and is checked
  again since [#2142]. Photos stored before the check existed are checked once
  by the `image-moderation-backfill` migration since [#2143], below, and stay
  unchecked until an operator has run it in production. A restaurant photo chosen during
  candidate verification is an operator's and is handed to
  `verifyRestaurantCandidate` without the check. The earlier decision and its
  reopening are in
  [Current State - Open Questions](../current-state/open-questions.md).

## The Image Check

Issue [#2138], the first story of epic [#2137]: `checkImage` in
`shared/moderation/check-image.ts`, next to `checkContent`, judges one uploaded
image before it is published. It takes the Storage object (bucket and path),
the upload surface - `bitePhoto`, `profilePhoto`, `restaurantPhoto` or
`biteTrailPhoto` - and the uploading account, and answers `passed`,
`refused` with a category, or `unavailable`. What a verdict does to the image
is the caller's; each upload path is its own story in the epic, and all four
apply it through `applyImageVerdict` in `shared/moderation/checked-image-subjects.ts`.
The Bite photo path ([#2139]) deletes a refused photo and marks the Bite
`refused`; see [Bite](../domain/bite.md). The profile photo path ([#2140])
deletes a refused photo and marks the profile `photoStatus: refused` while
`photoUrl` keeps the previous photo; see [User](../domain/user.md). The
restaurant and Bite Trail photo paths ([#2141]) share `publishCheckedFolderPhoto`:
a refused photo is deleted and the document gets `imageStatus: refused` while
`imagePath` keeps the previous photo; see [Restaurant](../domain/restaurant.md)
and [Bite Trail](../domain/bite-trail.md). On `unavailable` every path keeps the
photo `pending` and schedules it to be checked again ([#2142]), below.

- **What the model is asked.** The image goes to the same Gemini model as
  inline data, with `imageModerationInstructions`, which names the categories
  it may answer - `sexual`, `violence`, `hate`, `self_harm`, `illegal` - or
  `none`. The list was settled for the story in
  [Current State - Open Questions](../current-state/open-questions.md), `Image Moderation Questions`.
  The prompt says food in any form, alcohol, tobacco and a photo with no food
  are not objectionable. An answer outside the list reads as `none`.
- **One verdict per image.** A `passed` or `refused` verdict is kept in
  `contentChecks/{sha256}` by a hash of the image bytes, with
  `subject: image`, so the same image is judged once. `unavailable` is never
  kept.
- **It fails closed.** When the model errors, the image cannot be read, or
  the call passes `IMAGE_CHECK_TIMEOUT_MS` (20 seconds, inside a Storage
  trigger's 60), the check answers `unavailable` and the caller keeps the
  image unpublished. Unlike text, there is no wordlist to fall back on, so an
  outage must not publish unchecked images (epic [#2137]'s decision). An image
  over the 10 MB the Storage rules allow is never sent and answers
  `unavailable` too.
- **What it could not judge is checked again** ([#2142]). On `unavailable` the
  caller writes the `pending` status and three fields onto the document:
  `imageCheckAttempts`, the checks made so far; `imageCheckNextAt`, when the
  next is due in epoch milliseconds; and `imageCheckPath`, the object. The
  scheduled `recheckPendingImages` runs every 15 minutes, reads each of the four
  collections for documents whose `imageCheckNextAt` has passed, takes the 50
  oldest across them, checks them five at a time, and applies each verdict
  through the same `applyImageVerdict`, so a recheck publishes or refuses
  exactly as the upload would have. It writes in a transaction that first
  confirms the document still waits on the same object and attempt, so a newer
  upload's verdict is never overwritten. The waits between attempts are 15
  minutes, 30 minutes, 1, 2, 4 and 8 hours (`IMAGE_RECHECK_DELAYS_MS`), seven
  checks in all over about 16 hours, settled in
  [Current State - Open Questions](../current-state/open-questions.md). After the last, the unchecked object is
  deleted and the document gets `failed`, the state its uploader's retry
  starts from. An object that is gone fails at once, and a recheck that throws
  counts as one more attempt that could not answer. The rules refuse the three
  fields from every client but an operator's; the apps read `imageCheckNextAt`
  as a photo still being checked, not as an upload that stalled.
- **Photos stored before the check are checked once** ([#2143]).
  `imageModerationBackfillCallable` in `shared/moderation/image-moderation-backfill.ts`
  lists `images/bites/`, `images/users/`, `images/restaurants/` and
  `images/biteTrails/` and checks each object its document publishes - the one
  `imagePath` or `photoUrl` names; any other object in a folder is counted as
  `skipped`. It runs in two passes, settled in
  [Current State - Open Questions](../current-state/open-questions.md): `report`
  changes nothing and logs no refusal, and `apply`, refused until a report has
  finished, deletes each refused object and writes the subject's
  `storedRefusedUpdate` - `refused` with the category, and no published URL,
  since the refused photo was the one shown. A document whose newer upload is
  still `pending` loses only the URL. Both passes answer from `contentChecks`,
  so the apply pass asks the model about nothing the report judged. An
  `unavailable` verdict is left for a later run and never marks a stored photo
  `failed`. One call works for at most five minutes and keeps its place - the
  prefix and the Storage page token - in the server-only `migrationRuns`, and
  the next call carries on from there; the admin app calls until the run is
  complete. See [UC - Run Operational Migrations](../use-cases/uc-run-operational-migrations.md).
- **A refusal is recorded** under `content refused` with the account, the
  surface, the stage - `trigger`, or `backfill` for the apply pass above - the
  field `image`, the category as `reason` and the `storagePath`. No image data
  and no text go in the log.

Both checks send the content to Google Cloud as a processor, so the store
declarations do not change; the privacy policy names them in its own Gemini
entry. See [Implementation - Store Declarations](../implementation/store-declarations.md),
`The Automatic Content Check Changes No Declaration`.

The rules a member meets are on each use case:
[UC - Inspect Bite Details](../use-cases/uc-inspect-bite-details.md) for reviews,
[UC - Manage Profile And Social Graph](../use-cases/uc-manage-profile-and-social-graph.md) for profiles and
[UC - Create And Maintain Personal Bites](../use-cases/uc-create-and-maintain-personal-bites.md) for Bites.

## Outside Production

QA (`bite-tribe-qa`) and the emulator never call the model.
`resolveDeploymentStage` decides. `explainBite` stores and answers
`sampleExplanation`, marked `[QA]` or `[DEV]` in every part, so the cache can be
tested there too. `generateBiteDescription` answers
`sampleDescription`: `[QA] Sample description for <dish>. No AI is called
outside production.` (`[DEV]` in the emulator). Neither needs the Vertex AI
API, credentials or billing, and a test run spends nothing. The daily limit
still counts, so the limit message can be tested there. The content check
runs its wordlist there and no model, so a refusal can be tested with a listed
term. The image check reads no image there: it answers `passed`, except for a
file whose name contains `refuse-sample`, which answers `refused` with
category `sample` (source `sample` in the log), so QA can drive a refusal. What the model writes is seen only in production.

## The Model

`gemini-3.5-flash-lite` on the `global` endpoint, the cheapest tier, picked on
the Cusco City Top 5 dishes recorded on [#2030]. At $0.30 per million input
tokens and $2.50 per million output tokens, a call with a photo (about 1,400
tokens in, 35 out) costs about 0.05 cents. Paid Vertex AI usage is not used to
train Google's models. Vertex is not part of a Firebase plan; it is ordinary
Google Cloud usage on the same billing account.

## The Daily Limit

`aiUsage/{uid}` holds `{ day, descriptions, explanations }` for the current
UTC day, in `shared/utils/ai-usage.ts`. `DAILY_DESCRIPTION_LIMIT` is 10 and
`DAILY_EXPLANATION_LIMIT` is 20, each counted on its own. A kept explanation
costs nothing; only a new one is counted. A document from an earlier day is
replaced rather than merged, so a new day starts both counts at zero. The allowance is taken in a transaction before
the model is called and given back when the call produces nothing, so a
failure never costs the user one. A new day starts the count again. The
collection is server-only: the Firestore rules' default deny covers it, and
`deleteOwnAccount` removes the document with the account.

The feature is free today. When Pro ([UC - Subscribe To BiteTribe Pro](../use-cases/uc-subscribe-to-bitetribe-pro.md)) ships it becomes a
Pro feature, and the check belongs next to the allowance, in the function.

## What Leaves The Device

For the explanation, only the Bite id and the app language leave the device;
the function reads the rest from the Bite (see The Dish Explanation). For the
description, only what the Create Bite form already holds, and only when the
user taps **Generate**:

- the dish name (required: the button is disabled without it),
- the restaurant name, when one is picked,
- the Bite's exact position, when known - the city and country are not known
  yet at that moment, so the coordinates are what places the dish,
- the photo. A photo not uploaded yet is shrunk on the device to 768 px and
  sent as a JPEG data URL; when editing, the function reads the uploaded photo
  from our own bucket instead. `storagePathOf` accepts only download URLs of
  that bucket, so a crafted URL cannot make the function fetch anything else.

Nothing is stored besides the day's count, and the answer is only a
suggestion in the form: the user edits it or not, and posts it themselves.
The data goes to Google Cloud as a processor, as Firestore and Storage
already do, so the store declarations do not change; see
[Implementation - Store Declarations](../implementation/store-declarations.md). The privacy policy names the
service.

## The Prompt

`descriptionInstructions(language)` asks for one sentence of at most 120
characters, in the app language, explaining what the dish is rather than what
is on the plate, and leaving out what the Bite already shows (restaurant,
city, photo). No hashtags, emojis, first person or superlatives. An unknown
language falls back to English.

## Measuring It

`bite_explanation_requested` with `result` (`cached`, `generated`, `unknown`,
`limit_reached`, `error`) and `language`, once per answer the modal settles on;
`cached / (cached + generated)` is the cache's hit rate.

`bite_description_generated` with `result` (`success`, `error`,
`limit_reached`) and `mode` (`create`, `edit`), and `description_source` on
`bite_created` (`generated`, `generated_edited`, `manual`, `none`). See
[Implementation - Analytics Events](../implementation/analytics-events.md). The function logs token counts per call,
which is where the cost of AI alone is read from.

## Code Anchors

```text
apps/bite-tribe-firebase/functions/src/functions/shared/utils/gemini.ts
apps/bite-tribe-firebase/functions/src/functions/bites/generate-bite-description.ts
libs/bite-tribe/bite/data-access/src/lib/bite-data-access.service.ts
libs/bite-tribe/bite/page/src/lib/integration/bite.service.ts
libs/bite-tribe/bite/page/src/lib/components/page/bite.page.ts
libs/bite-tribe/bite/page/src/lib/components/page/utils/shrink-image-for-description.ts
apps/bite-tribe-firebase/functions/src/functions/shared/utils/ai-usage.ts
apps/bite-tribe-firebase/functions/src/functions/shared/utils/storage-image.ts
apps/bite-tribe-firebase/functions/src/functions/bites/explain-bite.ts
apps/bite-tribe-firebase/functions/src/functions/bites/delete-bite-explanations-on-bite-delete.ts
libs/bite-tribe/details/data-access/src/lib/bite-explanation-data-access.service.ts
libs/bite-tribe/details/page/src/lib/integration/details.service.ts
libs/bite-tribe/details/page/src/lib/components/bite-explanation/bite-explanation.component.ts
apps/bite-tribe-firebase/functions/src/functions/shared/moderation/check-content.ts
apps/bite-tribe-firebase/functions/src/functions/shared/moderation/objectionable-terms.ts
apps/bite-tribe-firebase/functions/src/functions/shared/moderation/content-refusal.ts
apps/bite-tribe-firebase/functions/src/functions/reviews/save-review.ts
apps/bite-tribe-firebase/functions/src/functions/users/update-profile-text.ts
apps/bite-tribe-firebase/functions/src/functions/users/claim-display-name.ts
apps/bite-tribe-firebase/functions/src/functions/bites/check-bite-content.ts
apps/bite-tribe-firebase/functions/src/functions/bites/moderate-bite-on-write.ts
```

## Production Setup

Checked on 15 November 2026, before the first release that carries the
function:

- **Vertex AI API:** enabled on `bite-tribe`, for the samples on [#2030].
  Not enabled on `bite-tribe-qa`, which needs none: see Outside Production.
- **Permission:** the functions run as the project's default compute service
  account, `<project number>-compute@developer.gserviceaccount.com`. Its
  `roles/editor` includes `aiplatform.endpoints.predict`, so no role was added.
  Should the functions ever get their own narrower account, it needs
  `roles/aiplatform.user`.
- **Cost:** no AI-only budget. Vertex costs fall under the existing
  `Bite Tribe Cost Budget Alert`, 75 CHF a month over the whole billing
  account; at about 0.05 cents a description, AI is not expected to move it.
  The Cloud Billing Budget API was enabled on `bite-tribe` to read it.

## Current Limitations

- No production call has run yet: the function reaches `bite-tribe` with the
  next release. The samples on [#2030] ran with a user's credentials, not the
  function's.
- The budget alert covers the whole account, so a rise in AI cost alone shows
  only in the function's token logs.
- The content check has no daily allowance. A text already judged costs
  nothing, but a member could still spend model calls by sending new text to
  `checkBiteContent`; App Check and the member requirement are the only bound.
- The content check's model verdicts have not been sampled against real Bites
  and reviews yet, so its false-refusal rate is unknown. A refused member has no
  appeal besides rewording.

[#1471]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1471
[#1610]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1610
[#2030]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2030
[#2137]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2137
[#2138]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2138
[#2106]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2106
[#2139]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2139
[#2140]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2140
[#2141]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2141
[#2142]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2142
[#2143]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2143
