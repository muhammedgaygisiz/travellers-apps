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

### Name Spelling

**BiteTribe is one word.** It is the spelling used by [[Mission]],
[[ADR-0001 Dish First Product]], the bundle identifier, and both store records.

Rule: the spaced form is a defect wherever it names the product. The only
legitimate space is in the Nx project and directory names (`bite-tribe`), which
are kebab-case identifiers rather than the product name.

The repository was corrected on 21 August 2026. The spaced form had reached
well past the app UI, and every one of these now carries the one-word spelling:

| Surface                                        | Where                                                                                                  |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| App locale JSON, 4 keys                        | `apps/bite-tribe/src/assets/i18n/*.json` and the business equivalent                                   |
| Document title                                 | `apps/bite-tribe/src/index.html`, `apps/bite-tribe-business/src/index.html`                            |
| `APP_TITLE`                                    | both shell providers, and the Storybook stories that mock the token                                    |
| Mail sender name                               | `SENDER_NAME` in `apps/bite-tribe-firebase/functions/src/functions/users/google-workspace-email.ts`    |
| Verification mail copy                         | `emailVerification.subject` and body in all eleven `functions/src/functions/shared/i18n/messages/*.ts` |
| CI step names, README, agent instruction files | prose that names the product                                                                           |

German compounds the name with hyphens, so `Bite-Tribe-E-Mail-Adresse` became
`BiteTribe-E-Mail-Adresse`. A search for the spaced form alone misses it.

Three categories were deliberately left spaced, because they are not the product
name being written down:

- The GitHub project board is literally named `Bite Tribe`. Documentation that
  names it is describing an external identifier, not the product. Renaming the
  board is a separate operational decision.
- [[issue-1265]] and [[Current State - Release Candidate Test Charter]] record
  dated console state and observed mail headers. Rewriting a past observation
  would make it assert something that was never true.
- Historical changelog entries under `build-*` quote past commit subjects.

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
palette and must be recaptured, not merely resized.** That covers the Play
feature graphic, whose orange band and orange lockup no longer match any surface
in the app, and both Play phone screenshots, which show orange app chrome.

### Capture Rules

- Capture against the current theme. A screenshot showing `#fec56b` as a header,
  button, or background colour is stale by definition.
- Capture from seeded, realistic data. An empty account is not a product page.
- Cover both light and dark, since the app ships both and the dark background
  (`#1a1c22`) is a deliberate surface.
- Keep the sources in the SSOT graph next to this page, so a re-shoot starts from
  the previous framing rather than from scratch.

## Current State

As inventoried on 21 August 2026.

### Google Play

The default listing is live and has been since 8 February 2026. There is one
listing, no custom listings, and no additional locales.

| Slot                  | State                                 |
| --------------------- | ------------------------------------- |
| App name              | `BiteTribe`, 9 / 30                   |
| Short description     | `Find it. Try it. Share it.`, 26 / 80 |
| Full description      | 224 / 4000                            |
| App icon              | present                               |
| Feature graphic       | present, stale palette                |
| Phone screenshots     | 2 of 8, stale palette                 |
| 7-inch tablet         | none                                  |
| 10-inch tablet        | none                                  |
| Chromebook, video, XR | none                                  |
| Website, phone number | empty                                 |

Two phone screenshots meets Play's minimum but not its promotion threshold,
which is four at 1080 px or more on each side.

### App Store Connect

Version 1.0 is in Prepare for Submission and is effectively empty.

| Slot                                    | State         |
| --------------------------------------- | ------------- |
| Name, subtitle                          | set           |
| Age rating                              | set, 18+      |
| Screenshots and previews                | none          |
| Description, promotional text, keywords | empty         |
| Support URL, marketing URL, copyright   | empty         |
| Primary category                        | not selected  |
| App Privacy                             | never started |
| Pricing, availability                   | not set       |
| Content Rights                          | not set up    |
| Build                                   | none attached |

TestFlight is the exception and is in good shape: internal and external groups
exist, build 94 (1.0.1) is in Testing, and the beta description, feedback email
and reviewer sign-in are all filled. The beta description is the best existing
draft of the App Store description and should seed it.

## Declarations

Play's ten app-content declarations are all complete. Apple's equivalents are
not started.

| Declaration      | Value                                                                               |
| ---------------- | ----------------------------------------------------------------------------------- |
| Privacy policy   | `https://bite-tribe.web.app/privacy`                                                |
| Account deletion | `https://bite-tribe.web.app/account-deletion`                                       |
| Content rating   | 12+ / Teen                                                                          |
| Target age group | 18 and over                                                                         |
| Ads              | none in this build                                                                  |
| Data shared      | none                                                                                |
| Data collected   | email, user IDs, precise location, photos, crash logs, app interactions, device IDs |
| Security         | encrypted in transit                                                                |

The Apple nutrition labels must be answered from this same list, so the two
stores describe one set of data flows. Revisit both when the AdMob epic
[[epic-1123]] lands, since `Ads` becomes true at that point.

Known contradiction: Play's data safety answer says accounts are created with
username and password only, while the published privacy policy describes Google
and Apple sign-in. One of the two is wrong and the code decides which.

Both public URLs render, but a cold load of the privacy policy can hit the App
Check gate and show the security-check screen first. A store reviewer opening
that link from a fresh browser can see it, which makes it a review risk rather
than a cosmetic one.

## Blockers Outside The Listing

These are account-level and gate submission regardless of listing completeness:

- The Apple Developer Program License Agreement has been updated and needs the
  Account Holder to accept it.
- Digital Services Act trader status is not provided. Apple removes apps from
  the EU App Store without it.
- The new social media age-rating questions are optional until 7 September 2026,
  but mandatory for a new app submission, which this is.
- Play's internal testing track is paused and holds a stale build 58 plus an
  `Untitled release` draft. [Issue #1179](https://github.com/muhammedgaygisiz/travellers-apps/issues/1179)
  needs it live to receive the release candidate.

## Related Pages

- [[Implementation - Store Release Steps]]
- [[Implementation - Localization]]
- [[Implementation - Release And Build Workflow]]
- [[Current State - Release State]]
- [[Current State - Release Candidate Test Charter]]
- [[ADR-0001 Dish First Product]]
