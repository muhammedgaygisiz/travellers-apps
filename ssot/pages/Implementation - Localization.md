# Implementation - Localization

## Purpose

Localization keeps BiteTribe usable across the app's supported languages and prevents visible UI copy from being scattered through templates and services.

## Locale Files

Consumer app:

```text
apps/bite-tribe/src/assets/i18n/ar.json
apps/bite-tribe/src/assets/i18n/am.json
apps/bite-tribe/src/assets/i18n/de.json
apps/bite-tribe/src/assets/i18n/en.json
apps/bite-tribe/src/assets/i18n/es.json
apps/bite-tribe/src/assets/i18n/fr.json
apps/bite-tribe/src/assets/i18n/id.json
apps/bite-tribe/src/assets/i18n/it.json
apps/bite-tribe/src/assets/i18n/pt.json
apps/bite-tribe/src/assets/i18n/th.json
apps/bite-tribe/src/assets/i18n/tr.json
```

Business app:

```text
apps/bite-tribe-business/src/assets/i18n/en.json
```

Push notifications:

```text
apps/bite-tribe-firebase/functions/src/functions/shared/i18n/messages/<lang>.ts
```

iOS permission prompts:

```text
apps/bite-tribe-ios/ios/App/App/<lang>.lproj/InfoPlist.strings
```

## Localized Surfaces

BiteTribe copy lives in seven places, because six of them are rendered by
something other than Transloco:

| Surface                | Owner                                | Rendered by                 |
| ---------------------- | ------------------------------------ | --------------------------- |
| App UI                 | Transloco locale JSON                | The running Angular app     |
| Push notifications     | Firebase Functions i18n catalog      | The OS, before the app runs |
| Verification mail      | Firebase Functions i18n catalog      | The recipient's mail client |
| Registration mail      | Firebase Auth email templates        | Firebase, in the console    |
| Legal documents        | `PUBLISHED_PRIVACY_POLICY_LANGUAGES` | The privacy-policy library  |
| iOS permission prompts | `InfoPlist.strings` per `.lproj`     | The OS, before the app runs |
| Store listings         | App Store Connect and Play Console   | The store, before install   |

The verification mail shares the notification catalog rather than owning a
second list, so it is not a fifth language list to maintain. The registration
mail and the store listings are the surfaces this repository cannot fully
control: their content lives in the Firebase, Apple and Google consoles, and the
code can only name the language.

Store listings are console configuration rather than a repository list, so they
do not add a fifth entry to `Adding A Language` below. They are still a language
list in practice: the decision in [[Implementation - Store Listing Assets]] is
that the listing locales match `availableLangs`, so a language added here is not
finished until both product pages carry it. A missing listing locale falls back
to English on the store page while the app itself does not.

All four language lists have to move together. Nothing fails a build when one is
forgotten — the user just silently gets English.

## Adding A Language

When a language is added, update **all** of these:

1. `availableLangs` in `libs/bite-tribe/shell/src/lib/app.config.ts`.
2. `apps/bite-tribe/src/assets/i18n/<lang>.json`.
3. `apps/bite-tribe-firebase/functions/src/functions/shared/i18n/messages/<lang>.ts`.
4. `PUBLISHED_PRIVACY_POLICY_LANGUAGES` in `libs/bite-tribe/privacy-policy`.
5. `apps/bite-tribe-ios/ios/App/App/<lang>.lproj/InfoPlist.strings`, **and**
   register it in `apps/bite-tribe-ios/ios/App/App.xcodeproj/project.pbxproj`:
   add a `PBXFileReference` for the file, add it to the `InfoPlist.strings`
   `PBXVariantGroup`, and add the language to `knownRegions`. A `.lproj`
   directory that is not in the variant group is never copied into the bundle.

Android needs nothing here. Its runtime permission dialogs are rendered by the
system with no per-app rationale text, and `strings.xml` in the Android wrapper
carries only the app name and URL scheme.

## Rules

- Use Transloco keys for visible text.
- Update every relevant locale when adding or changing user-facing copy.
- Push notification copy is localized in Firebase Functions, not in the app: the OS renders the notification before Transloco exists. The backend catalog carries one file per language the app offers and is bound to the recipient's `settings/{uid}.language`. Keep its language list in step with `availableLangs` in `libs/bite-tribe/shell/src/lib/app.config.ts`; see [[Implementation - Firebase Functions]] and issue \#1200.
- The verification mail reads from the same catalog under `emailVerification.*`, resolved through the shared `shared/utils/get-user-language.ts`, so an account hears from BiteTribe in one language across push and mail. Both senders localize: the manual resend and the monthly reminder job. A subject or body outside ASCII is MIME-encoded (RFC 2047 for the header, base64 for the body); sending translated copy as raw 7-bit reaches the inbox as mojibake. See issue \#1264.
- The registration mail is rendered by Firebase Auth from the email templates in the Firebase console, so it cannot read the catalog. Its language comes from the auth language code, which the app sets from the active Transloco language right before sending. The templates themselves are console configuration: a language whose template was never filled in still arrives in English, and nothing in this repository fails when that happens.
- Legal documents carry their own language list. The privacy policy renders only from `PUBLISHED_PRIVACY_POLICY_LANGUAGES` in `libs/bite-tribe/privacy-policy`, which currently holds all eleven app languages; anything outside it gets the English document plus a notice in the app language that says so. Extend that list together with `availableLangs`, and never let a legal document switch language silently; see [[UC - Use Account And Legal Flows]] and issue \#1218.
- iOS permission prompts are localized in `InfoPlist.strings`, not in Transloco: iOS renders the camera, location, and photo-library dialogs before the web view exists. The English text stays in `Info.plist` as the development-language fallback; each `<lang>.lproj/InfoPlist.strings` overrides it. A key present in `Info.plist` but missing from a locale falls back to English rather than showing the raw key.
- Name the app in permission copy. Every usage description starts with "BiteTribe" rather than "This app", which is what Apple's review guidance expects and what the location strings already did.
- Casing is localized too, and its language comes from the document rather than from the string. `text-transform: uppercase` applies the case mapping of the element's language, so `<html lang>` has to follow the active Transloco language; `provideDocumentLanguage` in `libs/bite-tribe/shell` subscribes to `langChanges$` and sets it. Without that, Turkish `i` uppercases to `I` instead of `İ` on every uppercased surface - Bite cards and the Bitemap drawer through Ionic's `ion-card-subtitle`, the review thread, the currency selector - while the lowercase source stays correct. Uppercasing done in TypeScript cannot read the attribute and needs `toLocaleUpperCase(lang)` with the language passed in explicitly, for the same reason `Intl` gets it as an argument. See issue \#1388 and [[issue-1388]].
- Formatted values are localized with `Intl`, not with locale JSON. Relative timestamps use `Intl.RelativeTimeFormat` with `numeric: 'auto'` and `style: 'short'`, region names use `Intl.DisplayNames`, dates use `Intl.DateTimeFormat`. The language is handed to them explicitly, because a pure Angular pipe is not re-evaluated on a language change unless the language is one of its arguments; components already expose it as an `activeLang` signal. See issue \#1272 and `libs/bite-tribe/details/page/src/lib/components/details-page/pipes/time-ago.pipe.ts`.
- Keep tone consistent inside each locale.
- German addresses the user informally with "du", never with "Sie". This holds across every surface: the app locale file, the notification and verification-mail catalog, and the privacy policy. The same choice is made per language wherever a language distinguishes formal and informal address.
- In German, the form follows what the string does, not what it says. Copy that asks the user to act - hints, coach copy, onboarding benefits, validation and error messages, parenthetical field instructions, and option rows that continue a flow with something the user typed - uses the du-imperative: `Verwende: "Jabri"`, `Tippe auf die Karte, um den Standort zu setzen.`, `Trenne sie mit Leerzeichen`. Controls that only name their action - buttons, menu entries, list actions, field placeholders - keep the conventional infinitive noun phrase: `Speichern`, `Konto löschen`, `Anzeigenamen eingeben`. The English source is the reliable signal: an English imperative sentence should arrive in German as an imperative, and an infinitive rendering of one is a translation artifact. See issue \#1268.
- Avoid hardcoded visible English in templates, alerts, labels, button text, empty states, and error states.
- Load a language before activating it when the switch happens in place, and let anything that translates synchronously - loading overlays, alerts, toasts - wait for that switch to settle.

## Code Anchors

```text
libs/bite-tribe/shell/src/lib/app.config.ts
libs/bite-tribe/shell/src/lib/document-language.ts
libs/bite-tribe/onboarding/data-access/src/lib/onboarding-data-access.service.ts
libs/bite-tribe/settings/data-access/src/lib/settings-data-access.service.ts
apps/bite-tribe-firebase/functions/src/functions/shared/utils/get-user-language.ts
apps/bite-tribe-firebase/functions/src/functions/users/google-workspace-email.ts
libs/common/ta-firestore/src/lib/auth.service.ts
```

## Validation

When editing locale JSON, parse all relevant locale files:

```bash
node -e "for (const f of process.argv.slice(1)) JSON.parse(require('fs').readFileSync(f,'utf8'))" apps/bite-tribe/src/assets/i18n/*.json apps/bite-tribe-business/src/assets/i18n/en.json
```

When editing the notification catalog, run the functions tests from `apps/bite-tribe-firebase/functions`; `shared/i18n/__specs__/translate.spec.ts` checks every locale for missing keys, lost placeholders, and blank copy.

When editing `InfoPlist.strings`, lint each file and confirm the language is
registered:

```bash
plutil -lint apps/bite-tribe-ios/ios/App/App/*.lproj/InfoPlist.strings
```

Registration is only proven by a build. The `.lproj` directories that reach the
bundle are the ones listed in the variant group:

```bash
xcodebuild -workspace apps/bite-tribe-ios/ios/App/App.xcworkspace -scheme App \
  -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath /tmp/bt-ios CODE_SIGNING_ALLOWED=NO build
ls -d /tmp/bt-ios/Build/Products/Debug-iphonesimulator/App.app/*.lproj
```

## Related Pages

- [[Architecture - Internationalization]]
- [[Architecture - Capacitor]]
- [[Implementation - Naming Conventions]]
