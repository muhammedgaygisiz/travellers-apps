# Architecture - Internationalization

## Purpose

Internationalization keeps BiteTribe usable across languages and travel contexts.

## Pattern

- Visible UI text should use Transloco keys.
- App translations live in `apps/bite-tribe/src/assets/i18n/*.json`.
- Business app translations live in `apps/bite-tribe-business/src/assets/i18n/*.json`.
- New visible text should update every relevant locale, not only English.
- The consumer app re-renders translated text when the active language changes, so a surface that switches language in place does not need a reload.

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
libs/**/page/**/*.html
```

## Current Limitations

- Several translations were AI-generated and need manual review.
- Product language should stay consistent with the BiteTribe mission and informal tone choices.
- Currency and location are related internationalization concerns, not just formatting concerns.
