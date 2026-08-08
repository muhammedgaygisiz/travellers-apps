# Architecture - Internationalization

## Purpose

Internationalization keeps BiteTribe usable across languages and travel contexts.

## Pattern

- Visible UI text should use Transloco keys.
- App translations live in `apps/bite-tribe/src/assets/i18n/*.json`.
- Business app translations live in `apps/bite-tribe-business/src/assets/i18n/*.json`.
- New visible text should update every relevant locale, not only English.
- The consumer app re-renders translated text when the active language changes, so a surface that switches language in place does not need a reload.
- Text the app never renders itself needs its own translation surface. Push notification copy is one: the OS shows it before the app runs, so it is translated in Firebase Functions at send time against the recipient's saved language (issue #1200).
- Legal documents are a second exception. They may only be shown in a language they were written for, so the privacy policy resolves the app language against its own published set instead of following `availableLangs`, renders with a static lang, and discloses the English fallback to anything outside that set (issue #1218). The set holds every app language today, so the two lists have to move together.
- iOS permission prompts are a third. The camera, location, and photo-library dialogs are rendered by iOS before the web view exists, so they are translated in `apps/bite-tribe-ios/ios/App/App/<lang>.lproj/InfoPlist.strings` and registered in the Xcode project rather than in Transloco. Android needs no counterpart: its runtime permission dialogs carry no per-app text.
- Transactional email is a fourth, and it has two senders with two different answers. The verification mail the backend sends is translated from the same Firebase Functions catalog as push notifications, against `settings/{uid}.language`. The mail Firebase Auth renders from its own email templates cannot reach that catalog at all; its language is whatever language code the app set on the auth instance before the send, which is the active Transloco language (issue #1264).

## Switching Language

There are two ways the app changes language:

- The settings page writes the preference and reloads the document, so the whole app restarts in the new language.
- The onboarding assistant switches in place, because a reload would tear down the in-progress flow.

An in-place switch has to load the locale before activating it. `setActiveLang` only announces the new language, so a synchronous `translate` running before the file arrives renders the raw key (issue #1186). Rendered text follows the switch through `reRenderOnLangChange` in the consumer app's Transloco config.

## Current Locale Scope

The app has translations for multiple languages including English, German, Turkish, French, Spanish, Italian, Arabic, Indonesian, Thai, Amharic, and Portuguese.

## Code Anchors

```text
apps/bite-tribe/src/assets/i18n
apps/bite-tribe-business/src/assets/i18n
apps/bite-tribe-firebase/functions/src/functions/shared/i18n
libs/**/page/**/*.html
```

## Current Limitations

- Several translations were AI-generated and need manual review, including the notification catalog in the functions app, the verification-mail copy added for issue #1264, and the iOS permission prompts added for build 93.
- The Firebase Auth email templates are console configuration, not code. Setting the auth language code only selects among the templates that exist there; a language whose template was never filled in still arrives in English, and no check in this repository can catch that.
- The language list exists four times: `availableLangs` in the consumer app's Transloco config, `SUPPORTED_LANGUAGES` in the functions catalog, `PUBLISHED_PRIVACY_POLICY_LANGUAGES` in the privacy-policy library, and the `InfoPlist.strings` variant group plus `knownRegions` in the iOS Xcode project. They are kept in step by hand, and nothing fails when one is missed — the user silently gets English. [[Implementation - Localization]] carries the add-a-language checklist.
- Product language should stay consistent with the BiteTribe mission and informal tone choices.
- Currency and location are related internationalization concerns, not just formatting concerns.
