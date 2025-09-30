# Language Switching Demo

This demonstrates the language switching functionality implemented for the Bite Tribe app.

## Features Added

1. **Language field in Settings interface**: Added `language?: SupportedLang` to the Settings model
2. **German language variants**: Added support for:
   - German (Germany) - `de-DE`
   - German (Switzerland) - `de-CH`
   - English - `en`
3. **Settings UI**: Added language selector in settings page
4. **Real-time language switching**: Language changes immediately when selected
5. **Price formatting**: Different locales format numbers differently:
   - German (Germany): `12,50` (comma as decimal separator)
   - German (Switzerland): `12.50` (period as decimal separator)
   - English (US): `12.50` (period as decimal separator)

## Translation Files Created

- `apps/bite-tribe/src/assets/i18n/en.json` - English translations
- `apps/bite-tribe/src/assets/i18n/de-DE.json` - German (Germany) translations
- `apps/bite-tribe/src/assets/i18n/de-CH.json` - German (Switzerland) translations

## Usage

1. Navigate to Settings page
2. Find the "Language" selector
3. Choose between:
   - English
   - German (Germany)
   - German (Switzerland)
4. The UI immediately updates to show the selected language
5. Price formatting follows the locale conventions

## Technical Implementation

- Uses Transloco for translation management
- Angular's formatNumber with locale-specific formatting
- Language setting is saved to user settings in Firestore
- Locale data is registered for proper number formatting
