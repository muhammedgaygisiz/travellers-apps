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

BiteTribe copy lives in four places, because three of them are rendered by
something other than Transloco:

| Surface                | Owner                                | Rendered by                 |
| ---------------------- | ------------------------------------ | --------------------------- |
| App UI                 | Transloco locale JSON                | The running Angular app     |
| Push notifications     | Firebase Functions i18n catalog      | The OS, before the app runs |
| Legal documents        | `PUBLISHED_PRIVACY_POLICY_LANGUAGES` | The privacy-policy library  |
| iOS permission prompts | `InfoPlist.strings` per `.lproj`     | The OS, before the app runs |

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
- Legal documents carry their own language list. The privacy policy renders only from `PUBLISHED_PRIVACY_POLICY_LANGUAGES` in `libs/bite-tribe/privacy-policy`, which currently holds all eleven app languages; anything outside it gets the English document plus a notice in the app language that says so. Extend that list together with `availableLangs`, and never let a legal document switch language silently; see [[UC - Use Account And Legal Flows]] and issue \#1218.
- iOS permission prompts are localized in `InfoPlist.strings`, not in Transloco: iOS renders the camera, location, and photo-library dialogs before the web view exists. The English text stays in `Info.plist` as the development-language fallback; each `<lang>.lproj/InfoPlist.strings` overrides it. A key present in `Info.plist` but missing from a locale falls back to English rather than showing the raw key.
- Name the app in permission copy. Every usage description starts with "BiteTribe" rather than "This app", which is what Apple's review guidance expects and what the location strings already did.
- Keep tone consistent inside each locale.
- Avoid hardcoded visible English in templates, alerts, labels, button text, empty states, and error states.
- Load a language before activating it when the switch happens in place, and let anything that translates synchronously - loading overlays, alerts, toasts - wait for that switch to settle.

## Code Anchors

```text
libs/bite-tribe/shell/src/lib/app.config.ts
libs/bite-tribe/onboarding/data-access/src/lib/onboarding-data-access.service.ts
libs/bite-tribe/settings/data-access/src/lib/settings-data-access.service.ts
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
