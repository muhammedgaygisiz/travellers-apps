# Architecture - AI

## Purpose

How BiteTribe calls a language model: where the call runs, what leaves the
device, what it costs and how it is limited. There are two AI
features: the generated Bite description of issue [#2030], and the dish
explanation on the Bite details page of issue [#2106]. Both follow the shape on
this page.

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

## Outside Production

QA (`bite-tribe-qa`) and the emulator never call the model.
`resolveDeploymentStage` decides. `explainBite` stores and answers
`sampleExplanation`, marked `[QA]` or `[DEV]` in every part, so the cache can be
tested there too. `generateBiteDescription` answers
`sampleDescription`: `[QA] Sample description for <dish>. No AI is called
outside production.` (`[DEV]` in the emulator). Neither needs the Vertex AI
API, credentials or billing, and a test run spends nothing. The daily limit
still counts, so the limit message can be tested there. What the model writes
is seen only in production.

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

[#2030]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2030
[#2106]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2106
