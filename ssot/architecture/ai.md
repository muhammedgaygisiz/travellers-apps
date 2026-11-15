# Architecture - AI

## Purpose

How BiteTribe calls a language model: where the call runs, what leaves the
device, what it costs and how it is limited. The first and so far only AI
feature is the generated Bite description of issue [#2030]; this page is the
shape any later one follows.

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

## The Model

`gemini-3.5-flash-lite` on the `global` endpoint, the cheapest tier, picked on
the Cusco City Top 5 dishes recorded on [#2030]. At $0.30 per million input
tokens and $2.50 per million output tokens, a call with a photo (about 1,400
tokens in, 35 out) costs about 0.05 cents. Paid Vertex AI usage is not used to
train Google's models. Vertex is not part of a Firebase plan; it is ordinary
Google Cloud usage on the same billing account.

## The Daily Limit

`aiUsage/{uid}` holds `{ day, descriptions }` for the current UTC day.
`DAILY_DESCRIPTION_LIMIT` is 10. The allowance is taken in a transaction before
the model is called and given back when the call produces nothing, so a
failure never costs the user one. A new day starts the count again. The
collection is server-only: the Firestore rules' default deny covers it, and
`deleteOwnAccount` removes the document with the account.

The feature is free today. When Pro ([UC - Subscribe To BiteTribe Pro](../use-cases/uc-subscribe-to-bitetribe-pro.md)) ships it becomes a
Pro feature, and the check belongs next to the allowance, in the function.

## What Leaves The Device

Only what the Create Bite form already holds, and only when the user taps
**Generate**:

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

`bite_description_generated` with `result` (`success`, `error`,
`limit_reached`) and `mode` (`create`, `edit`), and `description_source` on
`bite_created` (`generated`, `generated_edited`, `manual`, `none`). See
[Implementation - Analytics Events](../implementation/analytics-events.md). The function logs token counts per call,
which is where the cost is read from until a budget alert is set on the billing
account.

## Code Anchors

```text
apps/bite-tribe-firebase/functions/src/functions/shared/utils/gemini.ts
apps/bite-tribe-firebase/functions/src/functions/bites/generate-bite-description.ts
libs/bite-tribe/bite/data-access/src/lib/bite-data-access.service.ts
libs/bite-tribe/bite/page/src/lib/integration/bite.service.ts
libs/bite-tribe/bite/page/src/lib/components/page/bite.page.ts
libs/bite-tribe/bite/page/src/lib/components/page/utils/shrink-image-for-description.ts
```

## Current Limitations

- The function needs the Vertex AI API enabled on the project and its
  service account allowed to call it (`aiplatform.endpoints.predict`, part of
  the `Vertex AI User` role). The samples on [#2030] ran against the API with
  a user's credentials, not the function's.
- There is no budget alert yet; the token logs are the only cost signal.
- Local runs need `gcloud auth application-default login`; without it the
  emulated function answers `unavailable`.

[#2030]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2030
