# UC - Strengthen Location Currency And Data Quality Guidance

## Status

**Level:** L1

Supported today. Bite creation resolves the currency from the Bite position and prefills
it, keeps the user's preferred currency as the fallback, and leaves the choice editable
before saving; onboarding suggests the account default from the device region. The
restaurant/place picker is mandatory before saving and patches the Bite position when the
selected place carries a trustworthy one. What was once planned beyond that has been
settled rather than built - `Flow` says how.

## Goal

The app should help users avoid misleading Bite and Restaurant context.

Someone posting a Bite finds the currency and the place already right for where they ate,
and can correct either without being stopped. This page owns how those two signals are
derived, overridden and kept plausible; the permissions behind the position and the picker
itself belong to [UC - Create And Maintain Personal Bites](uc-create-and-maintain-personal-bites.md).

## Actors

- **Bite Creator** - acts: chooses the place, accepts or overrides the prefilled currency,
  and confirms the position the Bite is saved with.

## Flow

What ships today:

- App suggests the user's default currency during onboarding from the device region, read through the device time zone rather than through the interface language. See [issue-1262](../records/issue-1262.md).
- App prefills Bite currency from the selected Bite position when the backend can resolve a country currency.
- User preferred currency remains the fallback when the position is missing or currency resolution fails.
- User can manually correct the selected currency before saving.
- App rejects a price that is not a positive number and names the reason under the price field. Nothing checks how large the amount is.
- Bite creation now uses the restaurant/place picker before saving, and selected Google Places or nearby/local restaurants already patch the Bite position when they carry a trustworthy position.

What was planned beyond that. Each line has since been settled rather than built: the
edge-case proof is an accepted gap in [Current State - Release Candidate Test Charter](../current-state/release-candidate-test-charter.md),
and [#978] closed on the explicit condition that no mismatch-warning UI is added.

- Test vacation, border-region, posting-later, failed-geocode, and missing-location scenarios.
- Add mismatch warnings only if manual testing shows the prefill-plus-override flow is not enough.
- Do not reopen issue 902 as launch work unless real-world testing shows a remaining mismatch problem after the picker position patching. Any future warning should be source-aware and should keep explicit custom text publishable when no reliable place position exists.
- Avoid blocking Bite creation when the backend cannot resolve a currency.

## MVP Classification

**[MVP]** - the whole page. The currency and the position are fields of the Bite record
itself, so a Bite that carries the wrong one is wrong data at launch rather than a missing
convenience.

## App Store Review Area

Not relevant, because nothing here requests a permission or changes a store declaration.
The onboarding currency suggestion reads the device time zone precisely so that it needs no
location grant at the point it has to suggest something, and the Bite position it later
resolves against is obtained by [UC - Create And Maintain Personal Bites](uc-create-and-maintain-personal-bites.md), which owns
those prompts. It would become relevant if a mismatch check ever needed a live position of
its own, or if what the backend sends to Google while resolving a currency or a place
changed what [Implementation - Store Declarations](../implementation/store-declarations.md) declares.

## Supported Evidence

- `getCurrencyByPosition` in `apps/bite-tribe-firebase/functions/src/functions/location/get-currency-by-position.ts`, the backend currency resolution callable.
- `getCurrencyForDevice` in `libs/common/utils/src/lib/get-currency-for-device.ts`, called from `OnboardingService` with the device time zone.
- `FloatNumberDotNotationValidator` in `libs/bite-tribe/bite/page/src/lib/validators/float-number-dot-notation.validator.ts`, the price field's reject-and-explain validator.
- `onRestaurantSelected` and `onGooglePlaceSelected` in `libs/bite-tribe/bite/page/src/lib/components/page/bite.page.ts`, which patch the Bite `position` when the selected place carries one.

## Related GitHub Scope

- Issue [#909] covers launch location and currency quality. Closed as completed - the
  position-derived prefill and the preferred-currency fallback it asked for both ship.
- Issue [#589] asked for the price field to say why an invalid value blocks the save instead of
  blocking it silently, and pull request [#967] delivered it. Neither concerns how large a price
  is.
- Issue [#902] was rescoped by issue [#943] from resolving every typed restaurant name
  through Google Places to validating the selected place source against the Bite position,
  then closed as completed without a warning being built, because selected places already
  patch Bite position when possible.
- Issue [#978] covers currency prefill edge-case verification. Closed as completed on its
  own final acceptance criterion, that no extra mismatch-warning UI is added unless
  prefill-plus-override proves insufficient.
- [issue-1262](../records/issue-1262.md) moved the onboarding default currency suggestion from the interface
  language to the device region.

## Related Domains

- [Bite](../domain/bite.md)
- [Restaurant](../domain/restaurant.md)
- [User](../domain/user.md)

## Related Pages

- [Personas](../product/personas.md) - the audiences the `Actors` mapping displaced: the food lover and the
  traveler
- [UC - Create And Maintain Personal Bites](uc-create-and-maintain-personal-bites.md) - the picker, the position sources and the
  permissions this page's signals are derived from
- [Current State - Release Candidate Test Charter](../current-state/release-candidate-test-charter.md) - check 4, and the accepted gap that
  a real trip across a currency boundary is untested

[#589]: https://github.com/muhammedgaygisiz/travellers-apps/issues/589
[#902]: https://github.com/muhammedgaygisiz/travellers-apps/issues/902
[#909]: https://github.com/muhammedgaygisiz/travellers-apps/issues/909
[#943]: https://github.com/muhammedgaygisiz/travellers-apps/issues/943
[#967]: https://github.com/muhammedgaygisiz/travellers-apps/issues/967
[#978]: https://github.com/muhammedgaygisiz/travellers-apps/issues/978
