# Implementation - Naming Conventions

## Purpose

Naming conventions keep feature ownership readable in the filesystem, imports, tests, and generated Nx project names.

## Filesystem Names

- Use kebab-case for feature folders and implementation files.
- Use descriptive behavior names for Firebase Functions.
- Keep page libraries under `page`.
- Keep remote data libraries under `data-access`.

## Common File Names

| Suffix          | Meaning                                                    |
| --------------- | ---------------------------------------------------------- |
| `.component.ts` | Angular presentation component                             |
| `.container.ts` | Thin integration adapter between route/page and service    |
| `.service.ts`   | UI workflow, navigation, orchestration, or feature service |
| `.api.ts`       | Shared or feature API surface                              |
| `.actions.ts`   | NgRx actions                                               |
| `.effects.ts`   | NgRx effects                                               |
| `.reducer.ts`   | NgRx reducer                                               |
| `.selectors.ts` | NgRx selectors                                             |
| `.spec.ts`      | Unit or integration test                                   |
| `.stories.ts`   | Storybook stories                                          |

## Project Names

Nx project names may contain slashes.

Examples:

- `bite-tribe/profile`
- `bite-tribe/search`
- `bite-tribe/search-data-access`
- `bite-tribe/api`

Do not infer project names by replacing slashes with hyphens. Read the nearest `project.json`.

## Function Names

Firebase Function files should name the behavior they expose:

- `search-bites.ts`
- `search-users.ts`
- `load-bites-by-location.ts`
- `update-last-seen.ts`
- `set-bite-image-path-on-upload.ts`

Export new functions from `apps/bite-tribe-firebase/functions/src/index.ts`.

## Translation Keys

- Use stable keys for user-facing text.
- Add keys to every relevant app locale file.
- Avoid hardcoded visible English in templates, alert configuration, and page copy.

## Related Pages

- [[Implementation - Libraries]]
- [[Implementation - Firebase Functions]]
- [[Implementation - Localization]]
