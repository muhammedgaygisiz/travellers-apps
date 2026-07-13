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
- Bite creation now uses the restaurant/place picker before saving, so future location mismatch guidance should compare the Bite position with the selected place source when that source has a trustworthy position.

## Remaining Target Flow

- Test vacation, border-region, posting-later, failed-geocode, and missing-location scenarios.
- Add mismatch warnings only if manual testing shows the prefill-plus-override flow is not enough.
- If mismatch warnings are added, they should be source-aware: Google Places, verified restaurants, and local restaurants with known positions can validate distance; explicit custom text fallback should remain publishable when no reliable place position exists.
- Avoid blocking Bite creation when the backend cannot resolve a currency.

## Related GitHub Scope

- Issue 909 covers launch location and currency quality.
- Issue 967 covers suspicious price validation.
- Issue 902 covers source-aware selected-place and Bite-position mismatch warnings.
- Issue 978 covers currency prefill edge-case verification.

## Related Domains

- [[Bite]]
- [[Restaurant]]
- [[User]]
