---
name: travellers-apps-tests
description: Reliable testing workflow for the muhammedgaygisiz/travellers-apps Nx workspace. Use when Codex works in this repository and needs to choose, run, debug, or report tests for Angular/Ionic libraries, Firebase functions, shared model changes, profile/API/store changes, or when Nx project graph/daemon behavior hangs or obscures test output.
---

# Travellers Apps Tests

## Purpose

Use this skill to validate changes in `travellers-apps` without getting stuck on Nx graph/daemon behavior or using the wrong project names.

## Workflow

1. Confirm the repository root:
   - Expected root: `/Users/mo/DEV/travellers-apps`
   - Check status with `git status --short --branch`.

2. Identify touched projects before testing:
   - Prefer `git diff --name-only` and map changed files to the nearest `project.json`.
   - Project names may contain slashes, for example `bite-tribe/profile` and `bite-tribe/api`.
   - Do not infer Nx project names by replacing slashes with hyphens.

3. Try focused Nx tests when the project name is known:
   - Use `NX_DAEMON=false npx nx test "<project-name>" --runInBand`.
   - Quote slash-containing project names.
   - Run one Nx target at a time; parallel Nx runs may block each other on graph construction.

4. If Nx is silent, hangs, or reports project graph trouble:
   - Stop the run after a reasonable interval.
   - Read the touched project’s `project.json` for `targets.test.options.jestConfig`.
   - Run Jest directly with that config:

```bash
npx jest --config libs/bite-tribe/profile/page/jest.config.ts --runInBand
npx jest --config libs/bite-tribe/api/jest.config.ts --runInBand
```

5. Use direct Jest configs as the preferred fallback for this repo when validating a small set of edited libraries. This avoids waiting on Nx daemon/graph setup while preserving the library’s Jest transform and setup files.

6. Always run cheap consistency checks for broad file edits:
   - `git diff --check`
   - For JSON locale edits:

```bash
node -e "for (const f of process.argv.slice(1)) JSON.parse(require('fs').readFileSync(f,'utf8'))" apps/bite-tribe/src/assets/i18n/*.json apps/bite-tribe-business/src/assets/i18n/en.json
```

## Known Project Paths

- `libs/bite-tribe/profile/page/project.json`
  - Name: `bite-tribe/profile`
  - Jest config: `libs/bite-tribe/profile/page/jest.config.ts`

- `libs/bite-tribe/api/project.json`
  - Name: `bite-tribe/api`
  - Jest config: `libs/bite-tribe/api/jest.config.ts`

## Reporting

When finishing, report:

- Which test commands were run.
- Whether Nx was used or bypassed, and why.
- Any warnings that appeared but did not fail the run, such as existing `ts-jest` warnings or expected console errors from tests.
- Any tests that could not be run.
