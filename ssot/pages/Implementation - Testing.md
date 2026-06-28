# Implementation - Testing

## Purpose

Testing should prove the changed contract with the smallest reliable command.

## Default Validation Order

1. Identify touched projects with `git diff --name-only`.
2. Read the nearest `project.json` for the actual Nx project name.
3. Run focused Nx tests when the project graph behaves.
4. Fall back to direct Jest when Nx is silent, slow, or blocked by project graph issues.
5. Run specialized validation for Firebase Functions, locale JSON, Storybook, or native sync when the touched files require it.
6. Finish with `git diff --check`.

## Focused Nx Test

```bash
NX_DAEMON=false npx nx test "<project-name>" --runInBand
```

Run one Nx target at a time.

## Direct Jest Fallback

Read the touched project's `project.json`, then run its Jest config directly.

Examples:

```bash
npx jest --config libs/bite-tribe/profile/page/jest.config.ts --runInBand
npx jest --config libs/bite-tribe/api/jest.config.ts --runInBand
npx jest --config libs/bite-tribe/search/data-access/jest.config.ts --runInBand
```

## Other Checks

| Change Type                      | Check                                                                        |
| -------------------------------- | ---------------------------------------------------------------------------- |
| Firebase Functions               | `npm run build` and `npm run lint` from `apps/bite-tribe-firebase/functions` |
| Locale JSON                      | Parse all touched locale files with Node                                     |
| Storybook UI                     | `npm run build:storybook`                                                    |
| Capacitor native wrapper changes | `npx cap sync android` or the relevant Capacitor sync target                 |
| Markdown/docs                    | `git diff --check`                                                           |

## Related Pages

- [[Architecture - Testing]]
- [[Implementation - Firebase Functions]]
- [[Implementation - Storybook]]
