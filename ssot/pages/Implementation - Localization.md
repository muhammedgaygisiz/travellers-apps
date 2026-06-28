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

## Rules

- Use Transloco keys for visible text.
- Update every relevant locale when adding or changing user-facing copy.
- Keep tone consistent inside each locale.
- Avoid hardcoded visible English in templates, alerts, labels, button text, empty states, and error states.

## Validation

When editing locale JSON, parse all relevant locale files:

```bash
node -e "for (const f of process.argv.slice(1)) JSON.parse(require('fs').readFileSync(f,'utf8'))" apps/bite-tribe/src/assets/i18n/*.json apps/bite-tribe-business/src/assets/i18n/en.json
```

## Related Pages

- [[Architecture - Internationalization]]
- [[Implementation - Naming Conventions]]
