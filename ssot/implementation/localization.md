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

Admin app:

```text
apps/bite-tribe-admin/src/assets/i18n/en.json
```

Both internal apps are English-only on purpose. Their audience is restaurants
we onboard by phone and BiteTribe Operators, and a locale list kept in step for
no reader is cost without benefit. Copy added to a shared `scope:common`
component that only these two render therefore belongs in these two files, not
in the consumer app's eleven — an English string dropped into `de.json` is
permanently English there, which is worse than a key that is absent.

The converse holds for a `scope:common` component that all three apps render,
such as `image-upload`: its keys go into the consumer app's eleven files **and**
both internal `en.json` files. Each app loads only its own catalog, so a key
missing from one of them renders as the raw key in that app; see issue [#1613].

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
list in practice: the decision in [Implementation - Store Listing Assets](store-listing-assets.md) is
that the listing locales match `availableLangs`, so a language added here is not
finished until both product pages carry it. A missing listing locale falls back
to English on the store page while the app itself does not.

All four language lists have to move together. Nothing fails a build when one is
forgotten — the user just silently gets English.

## Adding A Language

When a language is added, update **all** of these:

1. `availableLangs` in `libs/bite-tribe/shell/src/lib/app.config.ts`.
2. `apps/bite-tribe/src/assets/i18n/<lang>.json`, and the new language's
   endonym under its own key in **every** locale file, not only the new one.
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
- Language names are the one group of strings that is not translated. Every locale file carries the same endonym for each offered language - `Deutsch`, `Türkçe`, `Português`, `አማርኛ` - so a speaker finds their own language in the picker whatever the interface is currently set to. Translating them, or naming one by its English exonym, hides that language from exactly the user who cannot read the rest of the list. `apps/bite-tribe/src/app/__specs__/language-names.spec.ts` asserts every name across every locale file; see issue [#1415].
- Push notification copy is localized in Firebase Functions, not in the app: the OS renders the notification before Transloco exists. The backend catalog carries one file per language the app offers and is bound to the recipient's `settings/{uid}.language`. Keep its language list in step with `availableLangs` in `libs/bite-tribe/shell/src/lib/app.config.ts`; see [Implementation - Firebase Functions](firebase-functions.md) and issue [#1200].
- The verification mail reads from the same catalog under `emailVerification.*`, resolved through the shared `shared/utils/get-user-language.ts`, so an account hears from BiteTribe in one language across push and mail. Both senders localize: the manual resend and the monthly reminder job. A subject or body outside ASCII is MIME-encoded (RFC 2047 for the header, base64 for the body); sending translated copy as raw 7-bit reaches the inbox as mojibake. See issue [#1264].
- The registration mail is rendered by Firebase Auth from the email templates in the Firebase console, so it cannot read the catalog. Its language comes from the auth language code, which the app sets from the active Transloco language right before sending. The templates themselves are console configuration: a language whose template was never filled in still arrives in English, and nothing in this repository fails when that happens.
- Legal documents carry their own language list. The privacy policy renders only from `PUBLISHED_PRIVACY_POLICY_LANGUAGES` in `libs/bite-tribe/privacy-policy`, which currently holds all eleven app languages; anything outside it gets the English document plus a notice in the app language that says so. Extend that list together with `availableLangs`, and never let a legal document switch language silently; see [UC - Use Account And Legal Flows](../use-cases/uc-use-account-and-legal-flows.md) and issue [#1218].
- iOS permission prompts are localized in `InfoPlist.strings`, not in Transloco: iOS renders the camera, location, and photo-library dialogs before the web view exists. The English text stays in `Info.plist` as the development-language fallback; each `<lang>.lproj/InfoPlist.strings` overrides it. A key present in `Info.plist` but missing from a locale falls back to English rather than showing the raw key.
- Name the app in permission copy. Every usage description starts with "BiteTribe" rather than "This app", which is what Apple's review guidance expects and what the location strings already did.
- Casing is localized too, and its language comes from the document rather than from the string. `text-transform: uppercase` applies the case mapping of the element's language, so `<html lang>` has to follow the active Transloco language; `provideDocumentLanguage` in `libs/bite-tribe/shell` subscribes to `langChanges$` and sets it. Without that, Turkish `i` uppercases to `I` instead of `İ` on every uppercased surface - Bite cards and the Bitemap drawer through Ionic's `ion-card-subtitle`, the review thread, the currency selector - while the lowercase source stays correct. Uppercasing done in TypeScript cannot read the attribute and needs `toLocaleUpperCase(lang)` with the language passed in explicitly, for the same reason `Intl` gets it as an argument. See issue [#1388] and [issue-1388](../records/issue-1388.md).
- Formatted values are localized with `Intl`, not with locale JSON. Relative timestamps use `Intl.RelativeTimeFormat` with `numeric: 'auto'` and `style: 'short'`, region names use `Intl.DisplayNames`, dates use `Intl.DateTimeFormat`. The language is handed to them explicitly, because a pure Angular pipe is not re-evaluated on a language change unless the language is one of its arguments; components already expose it as an `activeLang` signal. See issue [#1272] and `libs/bite-tribe/details/page/src/lib/components/details-page/pipes/time-ago.pipe.ts`.
- Keep tone consistent inside each locale.
- German addresses the user informally with "du", never with "Sie". This holds across every surface: the app locale file, the notification and verification-mail catalog, and the privacy policy. The same choice is made per language wherever a language distinguishes formal and informal address.
- In German, the form follows what the string does, not what it says. Copy that asks the user to act - hints, coach copy, onboarding benefits, validation and error messages, parenthetical field instructions, and option rows that continue a flow with something the user typed - uses the du-imperative: `Verwende: "Jabri"`, `Tippe auf die Karte, um den Standort zu setzen.`, `Trenne sie mit Leerzeichen`. Controls that only name their action - buttons, menu entries, list actions, field placeholders - keep the conventional infinitive noun phrase: `Speichern`, `Konto löschen`, `Anzeigenamen eingeben`. The English source is the reliable signal: an English imperative sentence should arrive in German as an imperative, and an infinitive rendering of one is a translation artifact. See issue [#1268].
- Copy addresses the user without a grammatical gender, in every language that has one. BiteTribe never asks for a gender, so a gendered form is always a guess, and the masculine is not a neutral default: it is the same guess, written as though it were not one. The rule holds on every surface this page lists: the app locale files, the notification and verification-mail catalog, `InfoPlist.strings` and the store listings. How each language gets there is set out under `Gender-Neutral Address` below. See issue [#1824].
- Avoid hardcoded visible English in templates, alerts, labels, button text, empty states, and error states.
- A brand term is keyed like any other string. `Bitemap` reads the same in every locale, which is exactly why a literal survives review: nothing looks wrong in any language. Keying it - one key, the same value in all eleven files - keeps the rule above checkable by reading the template, instead of by knowing which words happen to be brand. The same holds for copy that only one locale translates today, such as `bites`: ten catalogs carry the English word and Turkish carries `Bite'ler`, so a literal is invisible until a Turkish account opens the screen. See issue [#1612].
- Diacritics are part of the word, not decoration. A Turkish string written in ASCII - `Isik Modu` for `Işık Modu`, `Aydinlik` for `Aydınlık`, `Konum bulunamadi` for `Konum bulunamadı` - reads as sloppiness to a native speaker in a way an English reviewer never sees, and no build fails over it. `apps/bite-tribe/src/app/__specs__/locale-copy.spec.ts` pins the settings strings that shipped that way, and asserts that every locale file carries the same key set as `en.json` so a half-translated feature fails a test instead of silently falling back to English; see issue [#1416].
- A setting is named after what it chooses, not after one of its options. The theme row switches between light and dark, so Turkish `Işık Modu` ("light mode") named the option rather than the setting, and German and French had left `Theme` untranslated. It is `Tema`, `Design` and `Thème`; see issue [#1416].
- An empty state belongs to the list that shows it, not to the component that renders it. The discovery feed invites the user to post the first Bite, which is wrong on My Bites, where the list holds only that user's own Bites and they cannot be the first one in it. `bt-bite-list` therefore takes the Transloco key for its empty state as an input, defaulting to the feed invitation; see issue [#1417].
- Load a language before activating it when the switch happens in place, and let anything that translates synchronously - loading overlays, alerts, toasts - wait for that switch to settle.

## Gender-Neutral Address

The techniques below follow the inclusive-writing guidance published for each language. For BiteTribe the order of preference is the same everywhere:

1. **Rephrase.** Choose a sentence with no gendered word in it: a verb instead of an adjective, a noun instead of a participle, a question about the action instead of about the person.
2. **Use a neutral noun for people**: person, account, member, "whoever".
3. **Use the language's established fallback**, but only where 1 and 2 cannot carry the meaning.

Two things are never used. **The masculine as a default**, because it is not neutral. **Abbreviated markers inside a word** (`/a`, `(e)`, `@`, `x`, the French point médian, the Italian schwa, the Spanish and Portuguese `-e`), because the guidance in every one of these languages warns that screen readers and readers with dyslexia stumble on them. The one exception is the German colon. It is described under German below, and it is a last resort there too.

| Language   | Where gender appears                                                                                                  | What BiteTribe writes                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| English    | Pronouns for a third person                                                                                           | Singular `they` for a person whose gender the copy does not know. Never `he or she`.                                                                                                                                                                                                                                                                                                                                                                       |
| German     | Nouns for people (`Benutzer`, `Follower`)                                                                             | Neutral nouns and constructions first: `Personen`, `Mitglieder`, `Leute`, `wer …`, `alle, die …`, or a sentence with no person in it (`Noch niemand in der Bestenliste`). The Rat für deutsche Rechtschreibung has not admitted gender signs into the core orthography (2023), so the colon (`Creator:in`) is a fallback, used only where no neutral form exists, and it is the only sign used. Never the generic masculine, star, underscore or Binnen-I. |
| French     | Adjectives and participles agreeing with `tu` (`sûr`, `prêt`, `connecté`, `bienvenu`) and nouns for people            | Rédaction épicène through formulation neutre, as the OQLF describes it. Ask about the action, not the person: `Veux-tu vraiment supprimer ce Bite ?` instead of `Es-tu sûr… ?`. Use a noun for a state: `Connexion réussie`, `Tout est prêt`. `Bienvenue` (the noun) is neutral, the adjective `bienvenu` is not. Epicene nouns: `personne`, `membre`, `compte`. No point médian.                                                                          |
| Spanish    | Adjectives and participles agreeing with `tú` (`seguro`, `listo`, `conectado`, `bienvenido`) and nouns for people     | Ask about the action: `¿Quieres eliminar este Bite?`. Welcome with the noun: `Te damos la bienvenida`. People: `personas`, `cuenta`, `quien`, `nadie`, `la gente que te sigue`. No `@`, `x` or `-e`.                                                                                                                                                                                                                                                       |
| Italian    | Adjectives and participles agreeing with `tu` (`sicuro`, `pronto`, `connesso`, `benvenuto`) and nouns for people      | Ask about the action: `Vuoi davvero eliminare questo Bite?`. Welcome with the noun phrase `Ti diamo il benvenuto`. People: `persone`, `account`, `chi`, `nessuno`. No schwa and no asterisk.                                                                                                                                                                                                                                                               |
| Portuguese | Adjectives and participles agreeing with `você` (`bem-vindo`, `conectado`, `pronto`) and nouns for people             | `Tem certeza` is already neutral. Welcome with the noun `Boas-vindas`. A state as a noun: `Sessão iniciada`, `Tudo pronto`. People: `pessoas`, `conta`, `quem`, `ninguém`. No `x`, `@` or `-e`.                                                                                                                                                                                                                                                            |
| Arabic     | Imperatives (`اضغط` / `اضغطي`), second-person present verbs (`تتابع` / `تتابعين`) and adjectives (`متأكد` / `متأكدة`) | A second-person suffix written without vowel marks (`ك`, `ـت`) looks the same for both genders, so it stays, and no diacritic is ever added that would fix a gender. An instruction or request uses a verbal noun (masdar): `يُرجى المحاولة مرة أخرى`, `تأكيد حذف هذا الـBite؟`. Buttons are verbal nouns already (`حفظ`, `حذف`).                                                                                                                          |
| Amharic    | Informal second person, masculine (`-ህ`, `-ክ`) or feminine (`-ሽ`)                                                     | The polite form (`እርስዎ`, verbs in `-ሉ`, the suffix `-ዎ`) is gender-neutral, so Amharic uses it throughout: `ይከተላሉ`, `እንኳን በደህና መጡ`. This overrides the informal-address rule above, for Amharic only.                                                                                                                                                                                                                                                      |
| Thai       | Speaker particles (`ครับ` / `ค่ะ`) and first-person pronouns (`ผม` / `ดิฉัน`)                                         | The app's voice uses no gendered particle and no first-person pronoun. `คุณ` addresses the user.                                                                                                                                                                                                                                                                                                                                                           |
| Turkish    | No grammatical gender                                                                                                 | Avoid gendered nouns for people (`bay`, `bayan`).                                                                                                                                                                                                                                                                                                                                                                                                          |
| Indonesian | No grammatical gender                                                                                                 | Avoid gendered forms of address (`bapak`, `ibu`, `mas`, `mbak`). `kamu` addresses the user.                                                                                                                                                                                                                                                                                                                                                                |

**The guard.** `apps/bite-tribe/src/app/__specs__/locale-copy.spec.ts` denies, per locale, the gendered forms that already shipped, and names the locale and key it finds. A deny-list cannot prove a string neutral, so it backs up review rather than replacing it.

**Known limits.** A string with no natural neutral form keeps its clearest wording and is listed here, with its key and the reason, instead of being forced into awkward copy. Issue [#1825] left these:

| Key                    | Locales            | Why it stays                                                                                                                                                                                                                                                                                                                         |
| ---------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `followers`            | es, pt, fr, de, ar | A one-word label next to a count in the profile's stat row. The neutral paraphrase (`personas que te siguen`, `personnes qui te suivent`) is three to four times longer and breaks the row. Every sentence that mentions followers is rephrased. Italian and German use the loanword `Follower`, which Italian treats as invariable. |
| `review-creator-badge` | ar                 | A one-word badge beside a reviewer's name. Every Arabic word for a person is gendered, and a verb (`أنشأ`) would gender the person instead. The other locales use a verb phrase (`creó el Bite`, `a créé le Bite`).                                                                                                                  |

Sources: [UN Women gender-inclusive language guidelines](https://www.unwomen.org/en/digital-library/genderterm); [OQLF - rédaction épicène, formulation neutre](https://vitrinelinguistique.oqlf.gouv.qc.ca/25421/la-redaction-et-la-communication/feminisation-et-redaction-epicene/redaction-epicene/formulation-neutre/redaction-epicene-formulation-neutre-redaction-non-binaire-et-ecriture-inclusive); [Rat für deutsche Rechtschreibung, July 2023 decision (IDS)](https://ids-pub.bsz-bw.de/files/12065/Lobin_Henning_Was_der_Rechtschreibrat_2023.pdf); Spanish guides by [Chrysallis](https://www.lgbtqiahealtheducation.org/wp-content/uploads/2020/04/Guia-practica-de-lenguaje-inclusivo-Chrysallis.pdf) and [Spain's Ministry of Justice](https://www.mjusticia.gob.es/es/AreaTematica/DocumentacionPublicaciones/InstListDownload/Guia%20lenguaje%20inclusivo.pdf); Italian guidelines of the [CNR](https://cnr.it/sites/default/files/public/media/servizi/lineeGuida_ldg.pdf), after Robustelli; Portuguese [Guia de Linguagem Inclusiva, CIM Cávado](https://www.cm-barcelos.pt/wp-content/uploads/2023/04/Cavado_Guia_Linguagem-Inclusiva.pdf); [Microsoft localization style guides](https://learn.microsoft.com/en-us/globalization/reference/microsoft-style-guides) for Arabic and Thai.

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

The endonym convention has its own guard, which fails per locale file and per
language name rather than on the first mismatch:

```bash
npx jest --config apps/bite-tribe/jest.config.ts --runInBand apps/bite-tribe/src/app/__specs__/language-names.spec.ts
```

Key parity, the Turkish settings strings, the theme label and the gendered
welcome forms have a second guard next to it:

```bash
npx jest --config apps/bite-tribe/jest.config.ts --runInBand apps/bite-tribe/src/app/__specs__/locale-copy.spec.ts
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

- [Architecture - Internationalization](../architecture/internationalization.md)
- [Architecture - Capacitor](../architecture/capacitor.md)
- [Implementation - Naming Conventions](naming-conventions.md)

[#1200]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1200
[#1218]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1218
[#1264]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1264
[#1268]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1268
[#1272]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1272
[#1388]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1388
[#1415]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1415
[#1416]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1416
[#1417]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1417
[#1612]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1612
[#1613]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1613
[#1824]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1824
[#1825]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1825
