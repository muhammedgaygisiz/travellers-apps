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

## Rules

- Use Transloco keys for visible text.
- Update every relevant locale when adding or changing user-facing copy.
- Push notification copy is localized in Firebase Functions, not in the app: the OS renders the notification before Transloco exists. The backend catalog carries one file per language the app offers and is bound to the recipient's `settings/{uid}.language`. Keep its language list in step with `availableLangs` in `libs/bite-tribe/shell/src/lib/app.config.ts`; see [[Implementation - Firebase Functions]] and issue \#1200.
- Legal documents carry their own language list. The privacy policy renders only from `PUBLISHED_PRIVACY_POLICY_LANGUAGES` in `libs/bite-tribe/privacy-policy`, which currently holds all eleven app languages; anything outside it gets the English document plus a notice in the app language that says so. Extend that list together with `availableLangs`, and never let a legal document switch language silently; see [[UC - Use Account And Legal Flows]] and issue \#1218.
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

## Related Pages

- [[Architecture - Internationalization]]
- [[Implementation - Naming Conventions]]
