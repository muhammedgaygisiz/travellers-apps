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

## Remaining Target Flow

- Test vacation, border-region, posting-later, failed-geocode, and missing-location scenarios.
- Add mismatch warnings only if manual testing shows the prefill-plus-override flow is not enough.
- Avoid blocking Bite creation when the backend cannot resolve a currency.

## Related GitHub Scope

- [[issue-909]] covers launch location and currency quality.
- [[issue-967]] covers suspicious price validation.
- [[issue-978]] covers currency prefill edge-case verification.

## Related Domains

- [[Bite]]
- [[Restaurant]]
- [[User]]
