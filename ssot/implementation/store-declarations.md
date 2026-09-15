# Implementation - Store Declarations

## Purpose

Store declarations owns what BiteTribe has told Apple and Google **about** the
app, as opposed to what it shows in the listing: the app-content declarations,
the privacy nutrition labels, the age rating, the data-collection and deletion
answers, and the Digital Services Act trader status.

[[Implementation - Store Listing Assets]] owns the listing itself — identity,
copy, screenshots and the per-slot state of both consoles.
[[Implementation - Store Release Steps]] owns the console procedure.

## Why It Exists

Store declarations should help answer:

> What did we tell the stores this app does, and does the codebase still back it?

These answers have their own clock. A declaration goes stale when the app's data
practices change or when a store's own rules change, not when a release ships —
and a wrong one is a removal risk rather than a cosmetic defect. The age rating
was over-declared on three counts the codebase does not support, and that is
recorded below rather than silently corrected.

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

## Related Pages

- [[Implementation - Store Listing Assets]]
- [[Implementation - Store Listing Translations]]
- [[Implementation - Store Release Steps]]
- [[Current State - Release State]]
- [[Architecture - Auth]]
