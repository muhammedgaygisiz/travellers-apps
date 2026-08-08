# UC - Improve Localization Quality

## Status

Next to implement.

## Goal

Users should experience BiteTribe in clear, trustworthy language across supported locales.

## Actors

- Food lover
- Traveler
- New user

## Target Flow

- AI-generated translations are manually checked.
- Supported languages stay consistent and product-appropriate.
- Portuguese remains maintained as a supported locale.
- Copy the app never renders itself follows the account language too. The verification mail was English for every account until issue \#1264; the Firebase Auth registration mail still depends on templates maintained in the Firebase console rather than in this repository.

## Related GitHub Scope

- Issue \#738
- Issue \#1264

## Related Domains

- [[User]]
- [[Bite]]
