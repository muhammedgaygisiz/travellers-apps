# Architecture - Internationalization

## Purpose

Internationalization keeps BiteTribe usable across languages and travel contexts.

## Pattern

- Visible UI text should use Transloco keys.
- App translations live in `apps/bite-tribe/src/assets/i18n/*.json`.
- Business app translations live in `apps/bite-tribe-business/src/assets/i18n/*.json`.
- New visible text should update every relevant locale, not only English.

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
