# Implementation - CI Pipeline

## Purpose

CI pipeline describes the GitHub Actions workflows, the shared composite actions, the caching layers, and the rules that keep CI results correct and traceable.

The pipeline is the gate between a pull request and `develop`, and between `develop` and the deployed web apps.

## Workflows

| Workflow                                 | Trigger                                    | Purpose                                                                            |
| ---------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------- |
| `.github/workflows/pipeline.yml`         | Push to `develop`, PR to `develop`, manual | The main gate: lint, stylelint, tests, Loki, E2E, and every deploy                 |
| `.github/workflows/deploy-cv.yml`        | Manual                                     | Build and publish the `cv` app to its own Firebase project                         |
| `.github/workflows/analytics-digest.yml` | Daily 06:00 UTC, manual                    | Post the launch-analytics digest to a tracking issue, see [[Analytics Operations]] |

Only `pipeline.yml` runs automatically on code changes. Everything else is dispatched by hand or on a schedule.

Everything that ships from `develop` ships through `pipeline.yml`. A deploy that lives in its own manually dispatched workflow goes stale, because nothing reminds anyone to dispatch it: the Storybook deploy was a separate `workflow_dispatch` workflow and the published site drifted seven weeks behind `develop`. New deploy targets belong in `pipeline.yml` behind a `github.ref == 'refs/heads/develop'` guard.

Loki reference images are regenerated locally with `npm run loki:update` and committed in the pull request that changes the stories. There is no reference-update workflow, and one is not needed: [`tools/loki.mjs`](../../tools/loki.mjs) drives Chrome inside Docker, so a local update produces the same renderings that `npm run loki:test` compares against on a runner.

## Pipeline Job Graph

```text
setup
|
lint
|
stylelint
|
tests
|
+-- loki ------------+-- deploy-bite-tribe-storybook       (develop only)
+-- e2e -------------+-- report (pull requests only)
+-- business-e2e ----+
|
+-- bite-tribe-build ----------- deploy-bite-tribe           (develop only)
+-- bite-tribe-business-build -- deploy-bite-tribe-business  (develop only)
```

The lint, stylelint and tests chain is deliberately sequential so a cheap failure stops the run before the expensive jobs start. Everything after `tests` fans out in parallel.

`report` posts a single sticky PR comment with the E2E and Loki results. It runs with `if: !cancelled()` so a failing job is still reported.

## Composite Actions

| Action                                   | Used by                                | Responsibility                                                             |
| ---------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------- |
| `.github/actions/setup`                  | `setup`, deploys, standalone workflows | Restore `node_modules`, set up Node.js from `.nvmrc`, `npm ci`, save cache |
| `.github/actions/restore-cache`          | Every pipeline job                     | Exact-key restore of `node_modules`, no fallback                           |
| `.github/actions/install-if-missing`     | The two build jobs                     | `npm ci` when the restored `node_modules` is unusable                      |
| `.github/actions/setup-env-for-affected` | `lint`, `stylelint`, `tests`           | Derive `NX_BASE` and `NX_HEAD` through `nrwl/nx-set-shas`                  |
| `.github/actions/nx-cache`               | `lint`, `stylelint`, `tests`, builds   | Persist and restore the Nx computation cache                               |

## Caching Layers

Three independent caches, each with its own key:

| Cache          | Path                              | Key                                                                           |
| -------------- | --------------------------------- | ----------------------------------------------------------------------------- |
| Dependencies   | `node_modules`                    | `node-modules-<package-lock hash>`                                            |
| npm download   | npm's own cache directory         | `node-cache-<os>-npm-<package-lock hash>`                                     |
| Nx computation | `.nx/cache`, `.nx/workspace-data` | `nx-cache-v2-<os>-<run id>-<job>`, restored by the `nx-cache-v2-<os>-` prefix |

The Nx key is unique per run and job so every job saves its own entry, while the `restore-keys` prefix pulls the most recent entry from any earlier job or run. Nx keys its own entries by content hash, so restoring a slightly stale cache is safe: matching tasks are replayed and everything else is recomputed.

## Nx Cache Mechanics

The Nx cache is two things in two directories, and both must be cached together:

- `.nx/cache` holds the task **artifacts**: outputs and captured terminal output.
- `.nx/workspace-data/<machine-id>-v<schema>.db` is the SQLite **index** that maps a task hash to an artifact.

Cache lookups go through the index only. There is no filesystem fallback to `.nx/cache`, so caching the artifacts without the index produces a 0% hit rate: every task re-runs and the restored artifacts are dead weight. This was the state of CI until the index was added to the cached paths.

Nx names the index after the machine id of the host that wrote it, reading `/var/lib/dbus/machine-id` and falling back to `/etc/machine-id`, and exposes no override for the name. A runner whose machine id differs from the one that saved the cache would ignore the restored index and open an empty one, so the `nx-cache` action renames the restored database to the name the current runner will look for. The SQLite write-ahead log is renamed with it; the shared-memory and lock files are dropped because they are rebuilt.

`NX_MAX_CACHE_SIZE` caps `.nx/cache` in `pipeline.yml`. Nx would otherwise size it against free disk on the runner, which was harmless while the directory was rebuilt every run but is not once it genuinely accumulates. The repository shares a 10 GB GitHub Actions cache budget across all entries.

## Affected Computation

`lint`, `stylelint` and `tests` run through `nx affected`. Builds, Loki and E2E run unconditionally.

`pipeline.yml` sets `NX_BASE: develop` as a workflow-level default. `nrwl/nx-set-shas` then writes the resolved `NX_BASE` and `NX_HEAD` SHAs to `GITHUB_ENV`, which takes precedence for the steps that follow, so the affected jobs compare against the real merge base rather than the branch name. Jobs that need affected must therefore run `setup-env-for-affected` before the Nx command.

Every checkout in `pipeline.yml` uses `fetch-depth: 0` because affected needs full history.

## Build-Time Environment Variables

Nx task hashes do **not** include the `NX_APP_*` build-time variables. They are not declared as `env` inputs in `nx.json`, so two builds that differ only in those values share a task hash and Nx will replay either artifact for the other.

This is why the `deploy-bite-tribe` and `deploy-bite-tribe-business` jobs rebuild through the `setup` action instead of restoring the Nx cache: they are the only jobs that build with the production secrets, and a shared cache would let the secret-free bundle from `bite-tribe-build` be replayed into a deploy, or the reverse.

`deploy-bite-tribe-storybook` is not subject to this. The Storybook build reads no `NX_APP_*` variables, so it needs no secrets and its artifact is the same whichever job produced it.

See [[Implementation - Release And Build Workflow]] for how the values reach the bundle and which of them are public by design, and [[Current State - Known Issues]] for the deliberately misspelled `NX_APP_BITE_TRIBE_MESSAGINX_SENDER_ID` secret name.

## Rules

- Cache `.nx/cache` and `.nx/workspace-data` together. Either one alone is useless.
- Bump the Nx cache key prefix whenever the set of cached paths changes. Old entries can never produce a hit and would only be restored as dead weight.
- Do not add the `nx-cache` action to a job that builds with a different `NX_APP_*` set than the other jobs, unless those variables are first declared as `env` inputs in `nx.json`.
- Run `setup-env-for-affected` before any `nx affected` command, and keep `fetch-depth: 0` on its checkout.
- Verify a caching change by reading the `Cache: <hits>/<total> hit` line that Nx prints at the end of each run. The first run after a key change is always 0%; the second run on the same branch is the real signal.
- Pull requests read the cache scope of the default branch. A cache written by a pull request is visible only to that pull request, so a new caching behavior only proves itself once `develop` has run with it.
- Keep the E2E jobs on separate runners. Both suites drive the same Firebase emulator ports and would fight over them in one job.
- Add a new deploy to `pipeline.yml` behind `if: github.ref == 'refs/heads/develop'`. Do not give it a manually dispatched workflow of its own.
- Keep local and CI Node.js versions aligned through `.nvmrc` as defined by [[Current State - Nx And Dependency Migration Roadmap]].

## Code Anchors

```text
.github/workflows/pipeline.yml
.github/workflows/deploy-cv.yml
.github/workflows/analytics-digest.yml
.github/actions/nx-cache/action.yml
.github/actions/setup/action.yml
.github/actions/restore-cache/action.yml
.github/actions/install-if-missing/action.yml
.github/actions/setup-env-for-affected/action.yml
nx.json
.nvmrc
```

## Current Limitations

- `loki`, `e2e`, `business-e2e` and `deploy-bite-tribe-storybook` do not restore the Nx cache, so the Storybook build and the E2E app builds re-run on every pipeline run. On `develop` the Storybook is therefore built twice, once in `loki` and once in the deploy, at roughly 80 seconds each. Both Storybook builds are safe to put on the Nx cache; the E2E jobs build with `NX_APP_BITE_TRIBE_IS_DEV=true` and fall under the environment-variable rule above.
- Only the two build jobs carry `install-if-missing`. Every other job restores `node_modules` with an exact key and no fallback, so a cache miss or an unreachable cache service fails them with `nx: not found` instead of installing.
- There is no remote cache. Nx Cloud's free tier is exhausted too quickly for this workspace, and the self-hosted cache plugins (`@nx/gcs-cache` and siblings) are deprecated over CVE-2025-36852, an unpatchable cache-poisoning design flaw. The GitHub Actions cache is used instead, and its branch scoping provides the isolation those plugins lack.
- `pipeline.yml` has no native job, so there is no CI-built Android or iOS artifact. See [[Current State - Release Candidate Test Charter]].

## Related Pages

- [[Architecture - Nx Workspace]]
- [[Implementation - Release And Build Workflow]]
- [[Implementation - Testing]]
- [[Current State - Nx And Dependency Migration Roadmap]]
- [[Current State - Release Candidate Test Charter]]
