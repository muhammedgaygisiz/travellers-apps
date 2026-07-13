# UC - Strengthen Location Currency And Data Quality Guidance

## Status

Partially supported today and still needs edge-case proof before launch.

## Goal

The app should help users avoid misleading Bite and Restaurant context.

## Actors

- Bite creator
- Food lover
- Traveler

## Current Flow

- App prefills Bite currency from the selected Bite position when the backend can resolve a country currency.
- User preferred currency remains the fallback when the position is missing or currency resolution fails.
- User can manually correct the selected currency before saving.
- App warns when the entered price looks suspiciously high.
- Bite creation now uses the restaurant/place picker before saving, and selected Google Places or nearby/local restaurants already patch the Bite position when they carry a trustworthy position.

## Remaining Target Flow

- Test vacation, border-region, posting-later, failed-geocode, and missing-location scenarios.
- Add mismatch warnings only if manual testing shows the prefill-plus-override flow is not enough.
- Do not reopen issue 902 as launch work unless real-world testing shows a remaining mismatch problem after the picker position patching. Any future warning should be source-aware and should keep explicit custom text publishable when no reliable place position exists.
- Avoid blocking Bite creation when the backend cannot resolve a currency.

## Related GitHub Scope

- Issue 909 covers launch location and currency quality.
- Issue 967 covers suspicious price validation.
- Issue 902 was closed as obsolete after issue 943 because selected places already patch Bite position when possible.
- Issue 978 covers currency prefill edge-case verification.

## Related Domains

- [[Bite]]
- [[Restaurant]]
- [[User]]
