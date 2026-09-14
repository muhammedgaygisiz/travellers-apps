# UC - Improve Localization Quality

## Status

**Level:** L0.

Partly built, and the unbuilt half is a review rather than a feature. The consumer app ships
eleven locales - `en`, `de`, `fr`, `tr`, `es`, `it`, `ar`, `am`, `id`, `pt`, `th` - and the
catalogs are healthy: every locale file carries the same 666 keys, and `locale-copy.spec.ts`
and `language-names.spec.ts` fail the build when one drifts. The mechanics around them are
settled too, each with its own rule in [[Implementation - Localization]]: push and verification
mail read a backend catalog bound to the account language, the privacy policy has its own
published-language list, iOS permission copy lives in `InfoPlist.strings`, and casing and
formatted values are localized through the document language and `Intl`.

What is not done is the manual review of AI-generated copy, which epic \#738 tracks with one
story per language and which is outstanding for some of them, and the rule at
`Implementation - Localization.md:122` - "avoid hardcoded visible English in templates" -
which a sweep of the consumer templates found broken in two shapes: visible text nodes, in
nine components, and copy in `alt`, `title`, `placeholder` and `aria-label` attributes, which
a screen reader announces in English whatever the account language is. The issues below carry
the enumerated list. Brand terms are not among them - `BiteTribe`, `Bitemap`, `PRO` and, in
ten of the eleven locales, `Bites` are kept in English by the catalogs themselves. Nothing
enforces the rule; the guards that exist compare locale files with each other and never read
a template.

## Goal

Users should experience BiteTribe in clear, trustworthy language across supported locales.

This page owns the quality of what the user reads: whether a surface is translated at all,
whether the copy is right for its locale, and whether copy the app never renders itself
follows the account language. It does not own the localization mechanism - the catalogs, the
pipe, the backend list, `Intl` and `InfoPlist.strings` are [[Implementation - Localization]] -
nor which languages are offered, nor the store product pages, which are
[[Implementation - Store Listing Assets]].

## Actors

- **Bite Creator** - acts: reads every localized surface, and chooses the account language the
  app, the push notifications and the verification mail all follow.

## Flow

- AI-generated translations are manually checked.
- Supported languages stay consistent and product-appropriate.
- Portuguese remains maintained as a supported locale.
- Copy the app never renders itself follows the account language too. The verification mail was English for every account until issue \#1264; the Firebase Auth registration mail still depends on templates maintained in the Firebase console rather than in this repository.

## MVP Classification

**[MVP]** - the whole page. The consumer app is store-distributed in eleven locales, and a
shipping surface that renders English to ten of them is not the product the store listing
offers.

Not on this page: the business and admin apps, which are `availableLangs: ['en']` by
configuration rather than by omission, and the store product pages, which are English-only
today and are [[Implementation - Store Listing Assets]]'s.

## App Store Review Area

Relevant, in two places, neither of them the in-app literals. Apple renders the camera,
location and photo-library prompts itself, so their copy is localized in
`apps/bite-tribe-ios/ios/App/App/*.lproj/InfoPlist.strings` and a locale missing a key falls
back to English in a dialog the reviewer sees. And the listing locale set is bound to
`availableLangs`, so adding a language is not finished until both product pages carry it.

## Related GitHub Scope

- Issue \#738 - the localization and translation epic, one story per language. Open; it owns
  the manual review of AI-generated copy that this page's first Flow bullet asks for
- Issue \#1264 - the verification mail ignored the account language. Closed as completed, and
  the fourth Flow bullet describes the state after it
- Issue \#1612 - the five components that already use Transloco and carry one stray literal
  each. Open
- Issue \#1613 - the four consumer components that import no Transloco at all, whose every
  visible string and announced attribute is English in all eleven locales. Open

## Related Domains

- [[User]]
- [[Bite]]

## Related Pages

- [[Personas]] - the food lover, the traveler and the new user this page used to name as
  actors
- [[Implementation - Localization]] - the mechanism: catalogs, the pipe, the backend list,
  `Intl`, `InfoPlist.strings`, and the rule the hardcoded template copy breaks
- [[Implementation - Store Listing Assets]] - the listing locales bound to `availableLangs`,
  English-only today
- [[Implementation - Store Listing Translations]] - the listing copy itself
- [[UC - Use Account And Legal Flows]] - the privacy policy's own published-language list
