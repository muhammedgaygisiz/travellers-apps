# Implementation - CI Pipeline

## Purpose

CI pipeline describes the GitHub Actions workflows, the shared composite actions, the caching layers, and the rules that keep CI results correct and traceable.

The pipeline is the gate between a pull request and `develop`, and between `develop` and the deployed web apps.

## Workflows

| Workflow                                 | Trigger                                    | Purpose                                                                                              |
| ---------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `.github/workflows/pipeline.yml`         | Push to `develop`, PR to `develop`, manual | The main gate: lint, stylelint, tests, Loki, E2E, and every deploy                                   |
| `.github/workflows/deploy-cv.yml`        | Manual                                     | Build and publish the `cv` app to its own Firebase project                                           |
| `.github/workflows/analytics-digest.yml` | Daily 06:00 UTC, manual                    | Post the launch-analytics digest to a tracking issue, see [[Analytics Operations]]                   |
| `.github/workflows/native-release.yml`   | Push of a `build-*` tag, manual            | Build the signed Android bundle and iOS archive, see [[Implementation - Release And Build Workflow]] |

`pipeline.yml` is the only workflow that runs on a branch or pull request.
`native-release.yml` also runs without being dispatched, but on a `build-*`
tag rather than on a code change. The rest is dispatched by hand or on a
schedule.

Everything that ships from `develop` ships through `pipeline.yml`. A deploy that lives in its own manually dispatched workflow goes stale, because nothing reminds anyone to dispatch it: the Storybook deploy was a separate `workflow_dispatch` workflow and the published site drifted seven weeks behind `develop`. New deploy targets belong in `pipeline.yml` behind a `github.ref == 'refs/heads/develop'` guard.

`native-release.yml` is the one exception, and it is an exception to the
reasoning rather than to the rule. It does not ship from `develop`, it is
fired by the `build-*` tag every release creates, and it needs a macOS runner
no pull request should pay for. Nothing about it can go stale unnoticed,
because the release that would notice is the thing that triggers it.

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
+-- functions-build                                          (no deploy yet)
```

`functions-build` compiles the Firebase functions and stops there. It has no deploy counterpart on purpose: gen2 functions have no rollback, and Firestore indexes must be deployed first and separately, so the deploy is a decision rather than a wiring job. See [[Implementation - Firebase Functions]].

The lint, stylelint and tests chain is deliberately sequential so a cheap failure stops the run before the expensive jobs start. Everything after `tests` fans out in parallel.

`report` posts a single sticky PR comment with the E2E and Loki results. It runs with `if: !cancelled()` so a failing job is still reported.

## Composite Actions

| Action                                   | Used by                                | Responsibility                                                             |
| ---------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------- |
| `.github/actions/setup`                  | `setup`, deploys, standalone workflows | Restore `node_modules`, set up Node.js from `.nvmrc`, `npm ci`, save cache |
| `.github/actions/restore-cache`          | Every pipeline job                     | Exact-key restore of `node_modules`, no fallback                           |
| `.github/actions/install-if-missing`     | The build jobs                         | `npm ci` when the restored `node_modules` is unusable                      |
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

`lint`, `stylelint` and `tests` run through `nx affected`. Builds, Loki and E2E run unconditionally, which is why `functions-build` is the type check for the Firebase functions rather than an affected-gated target: it compiles them on every run.

`pipeline.yml` sets `NX_BASE: develop` as a workflow-level default. `nrwl/nx-set-shas` then writes the resolved `NX_BASE` and `NX_HEAD` SHAs to `GITHUB_ENV`, which takes precedence for the steps that follow, so the affected jobs compare against the real merge base rather than the branch name. Jobs that need affected must therefore run `setup-env-for-affected` before the Nx command.

Every checkout in `pipeline.yml` uses `fetch-depth: 0` because affected needs full history.

## Build-Time Environment Variables

Nx task hashes do **not** include the `NX_APP_*` build-time variables. They are not declared as `env` inputs in `nx.json`, so two builds that differ only in those values share a task hash and Nx will replay either artifact for the other.

This is why the `deploy-bite-tribe` and `deploy-bite-tribe-business` jobs rebuild through the `setup` action instead of restoring the Nx cache: they are the only jobs that build with the production secrets, and a shared cache would let the secret-free bundle from `bite-tribe-build` be replayed into a deploy, or the reverse.

`deploy-bite-tribe-storybook` is not subject to this. The Storybook build reads no `NX_APP_*` variables, so it needs no secrets and its artifact is the same whichever job produced it.

See [[Implementation - Release And Build Workflow]] for how the values reach the bundle and which of them are public by design, and [[Current State - Known Issues]] for the deliberately misspelled `NX_APP_BITE_TRIBE_MESSAGINX_SENDER_ID` secret name.

## Repository Visibility And Actions Cost

The repository is **public**, and that is what makes CI free. GitHub charges
nothing for standard GitHub-hosted runners on a public repository, and
`macos-latest` is a standard runner. Actions minutes are only billed once a
repository is private.

This is worth writing down because the intuition runs the other way: the macOS
`10x` minute multiplier is the number everyone reaches for when the native jobs
come up, and it does not apply here at all.

### Measured, 30 days to 30 August 2026

| Figure                                            | Value                    |
| ------------------------------------------------- | ------------------------ |
| `pipeline.yml` runs                               | 261                      |
| Billable job-minutes per run, summed over 13 jobs | 20-27, call it 23        |
| Linux minutes per month                           | ~6,000                   |
| Analytics digest runs                             | 29, a minute or two each |
| Cost                                              | **0**                    |

Wall-clock per run is 10-25 minutes, which is not the billable figure: the jobs
after `tests` fan out in parallel, so billing sums the jobs and the parallelism
buys latency rather than money.

### What going private would cost

| Line                                                  | Estimate                                   |
| ----------------------------------------------------- | ------------------------------------------ |
| Included minutes                                      | 2,000/month Free, 3,000 Pro                |
| Linux overage, ~3,000-4,000 min at `$0.008`           | `$24-32`/month                             |
| iOS job, ~25 min per release, `10x`, at `$0.08`/min   | `$8`/month at four releases                |
| Artifact storage, `.aab` + `.ipa` + dSYMs for 90 days | 500 MB-2 GB included, then `$0.008`/GB/day |
| Total                                                 | **roughly `$40`/month**                    |

The account plan could not be read when this was measured - `gh api user`
returns `plan: null` without the right token scope - so the included-minutes row
is the one figure to confirm before trusting the total.

The shape matters more than the total: **the pipeline is the bill, not the
native jobs.** The iOS archive is about a fifth of it. Anyone proposing to go
private to control native build cost has the causation backwards, and anyone
proposing to drop the native jobs to save money on a public repository is saving
nothing.

### Public Does Not Mean Exposed

Nothing in `.github/workflows` uses `pull_request_target`, so a pull request from
a fork never receives secrets. `native-release.yml` triggers only on a `build-*`
tag push and on `workflow_dispatch`, both of which require write access, so the
signing secrets are unreachable from a fork under any trigger.

What a reader can see is configuration and identifiers, not credentials: the
Android signing block, the Apple team id, the upload key's SHA-256 fingerprint -
which Play publishes anyway under **App signing** - and the Firebase client
configuration that [[Implementation - Release And Build Workflow]] records as
public by design.

The one thing a public repository genuinely exposes is `ssot/pages` itself: the
release-candidate charter, [[Current State - Known Issues]], and the open
findings, in detail. If visibility is ever revisited, that is the argument.
It is a disclosure decision, not a cost or a security-of-signing one, and it
costs about `$40` a month to act on.

### Not The Answer

A self-hosted macOS runner would avoid the multiplier, and it would put the
store artifact back on one machine's toolchain and signing state - which is the
thing [issue #1181](https://github.com/muhammedgaygisiz/travellers-apps/issues/1181)
exists to remove. If the bill ever needs cutting, cut it in the pipeline first;
the Nx-cache gaps under Current Limitations are the larger lever.

## Rules

- Cache `.nx/cache` and `.nx/workspace-data` together. Either one alone is useless.
- Bump the Nx cache key prefix whenever the set of cached paths changes. Old entries can never produce a hit and would only be restored as dead weight.
- Do not add the `nx-cache` action to a job that builds with a different `NX_APP_*` set than the other jobs, unless those variables are first declared as `env` inputs in `nx.json`.
- Run `setup-env-for-affected` before any `nx affected` command, and keep `fetch-depth: 0` on its checkout.
- Verify a caching change by reading the `Cache: <hits>/<total> hit` line that Nx prints at the end of each run. The first run after a key change is always 0%; the second run on the same branch is the real signal.
- Pull requests read the cache scope of the default branch. A cache written by a pull request is visible only to that pull request, so a new caching behavior only proves itself once `develop` has run with it.
- Keep the E2E jobs on separate runners. Both suites drive the same Firebase emulator ports and would fight over them in one job.
- Add a new deploy to `pipeline.yml` behind `if: github.ref == 'refs/heads/develop'`. Do not give it a manually dispatched workflow of its own. A separate workflow needs a trigger that fires on its own, as `native-release.yml`'s tag does.
- Do not use `.github/actions/setup` or `.github/actions/restore-cache` from a macOS or Windows job. The `node_modules` cache key is `node-modules-<package-lock hash>` with no runner OS in it, so a non-Linux job would restore Linux native binaries, and saving would overwrite the entry every other job depends on. Use `actions/setup-node` and `npm ci` directly, as the `ios` job does.
- Keep local and CI Node.js versions aligned through `.nvmrc` as defined by [[Current State - Nx And Dependency Migration Roadmap]].
- Price a change of repository visibility before making one. CI is free because the repository is public, and going private starts a bill dominated by `pipeline.yml` rather than by the native jobs. See Repository Visibility And Actions Cost above.
- Do not add a self-hosted runner to escape a minute multiplier. It reintroduces the single-workstation build that issue #1181 removed.

## Code Anchors

```text
.github/workflows/pipeline.yml
.github/workflows/deploy-cv.yml
.github/workflows/analytics-digest.yml
.github/workflows/native-release.yml
tools/assert-release-bundle.mjs
tools/write-build-provenance.mjs
apps/bite-tribe-ios/ios/App/ExportOptions.plist
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
- The native jobs in `native-release.yml` have never run. The Android and iOS signing secrets are not provisioned, so the workflow is written and reviewed but unexecuted, and the manual workstation release in [[Implementation - Store Release Steps]] is still the one that produces store artifacts. See [[Current State - Release Candidate Test Charter]].
- `native-release.yml` builds on whatever Xcode `macos-latest` carries. An artifact is reproducible against a commit, not against a toolchain.

## Related Pages

- [[Architecture - Nx Workspace]]
- [[Implementation - Release And Build Workflow]]
- [[Implementation - Testing]]
- [[Current State - Nx And Dependency Migration Roadmap]]
- [[Current State - Release Candidate Test Charter]]
