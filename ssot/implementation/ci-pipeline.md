# Implementation - CI Pipeline

## Purpose

CI pipeline describes the GitHub Actions workflows, the shared composite actions, the caching layers, and the rules that keep CI results correct and traceable.

The pipeline is the gate between a pull request and `develop`, and between `develop` and the deployed web apps.

## Workflows

| Workflow                                 | Trigger                                    | Purpose                                                                                                                           |
| ---------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `.github/workflows/pipeline.yml`         | Push to `develop`, PR to `develop`, manual | The main gate: lint, stylelint, tests, Loki, E2E, and every deploy                                                                |
| `.github/workflows/deploy-cv.yml`        | Manual                                     | Build and publish the `cv` app to its own Firebase project                                                                        |
| `.github/workflows/analytics-digest.yml` | Daily 06:00 UTC, manual                    | Post the launch-analytics digest to a tracking issue, see [Analytics Operations](../operations/analytics-operations.md)           |
| `.github/workflows/native-release.yml`   | Push of a `build-*` tag, manual, called    | Build the signed Android bundle and iOS archive, see [Implementation - Release And Build Workflow](release-and-build-workflow.md) |
| `.github/workflows/release.yml`          | Manual                                     | Cut a release: branch, changelog, tag, native build, pull request, see [Release Workflow](../overview/release-workflow.md)        |

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
test-shard (x4) -- tests
|
+-- loki-build -- loki-capture (x2) -- loki --+-- deploy-bite-tribe-storybook (develop only)
+-- e2e-shard (x3) -- e2e --------------------+-- report (pull requests only)
+-- business-e2e -----------------------------+
|
+-- firestore-rules ----------- deploy-firestore-rules       (develop only)
+-- functions-emulator
|
+-- deploy-firestore-indexes --+                             (develop only)
|                              |
+-- build ---------------------+- deploy-bite-tribe          (develop only)
                               +- deploy-bite-tribe-business (develop only)
                               +- deploy-bite-tribe-admin    (develop only)
                               +- deploy-functions           (develop only)
```

## Which Suites Gate A Merge

Not every test in this repository runs on a pull request, and the difference is
worth stating rather than inferring from a workflow file.

| Suite                       | Command                 | Gates a merge                                  |
| --------------------------- | ----------------------- | ---------------------------------------------- |
| Unit tests                  | `nx run-many -t test`   | Yes, `tests` (4 shards), for the affected ones |
| App and functions builds    | `nx run-many -t build`  | Yes, `build`, for the affected ones            |
| Lint, Stylelint             | `nx affected -t lint`   | Yes                                            |
| SSOT structure              | `npm run check:ssot`    | Yes, inside `lint`                             |
| Visual regression           | `npm run loki:test`     | Yes, `loki`, when a story is affected          |
| Consumer and business e2e   | `nx e2e …`              | Yes, `e2e` (3 shards), `business-e2e`          |
| Firestore rules             | `npm run test:rules`    | Yes, `firestore-rules`                         |
| Firebase Functions emulator | `npm run test:emulator` | Yes, `functions-emulator`                      |

**Coverage Is Informational.** `codecov/project` is reported on every pull
request and never fails one: `codecov.yml` sets it `informational`. Each
`test-shard` leg runs its share of the affected Jest projects with coverage
and uploads it under the `unittests` flag, so a pull request uploads coverage
for the projects it affects and nothing else. The project figure is then taken
over a different set of files each time, and it moves with that set: on [#1839]
it compared 503 files against the base's 709 and reported a 0.54% drop the
change did not cause, while neighbouring pull requests had been measured over
2 and 672 files. A number that cannot be compared between two runs cannot gate a
merge. The per-file report in Codecov's comment still names lines a change left
uncovered, and those are worth reading.

**The unit-test job cannot see the emulator specs, and that is deliberate.**
`jest.config.cjs` matches `src/**/*.spec.ts`; an emulator spec is
`*.emulator-spec.ts` and runs under `jest.emulator.config.cjs`, because it
needs a Firestore emulator and a JVM to run it. The two suites therefore need
two jobs.

Until [issue #1681][#1681] the second job did not exist. `firestore-rules` runs
`--testPathPatterns firestore-rules`, which is the rules specs alone, so the
other ~530 assertions - table sessions, orders, visits, assistance signals, QR
abuse protection - were verified only when somebody remembered to run them by
hand. Three of them had been failing on `develop` since 16 September 2026 and
nothing said so.

What those specs hold is the part a unit test cannot reach: what happens inside
a Firestore transaction when two callers contend on one document. The product's
correctness at a table rests on transactions rather than on single writes, so a
mocked store would assert that the code called `set` - which was never the part
in doubt.

**`functions-emulator` is a job of its own rather than a widening of
`firestore-rules`.** `deploy-firestore-rules` depends on that job, and rules
reach production the instant they land and cannot be staged or rolled back.
Gating that deploy on a table-ordering spec would couple two things that answer
different questions and should be able to fail independently.

`deploy-functions` is the only job with two `needs`: `build` for the compile
check and `deploy-firestore-indexes` for the ordering. The three web deploys
take `build` only.

**One job builds all four.** Until [issue #1819][#1819] each app and the
functions had a build job of its own, and each spent 25 to 40 seconds of a
roughly one-minute job on checkout and cache restore. A pull request that fans
out to that many runners at once queues behind itself: in run 40573152209
`loki` started 40.7 minutes in, although everything it needed had finished at
4.7. `build` asks `nx show projects --affected` which of `bite-tribe`,
`bite-tribe-business`, `bite-tribe-admin` and `functions` a change affects and
builds those with `nx run-many`, so a pull request that only touches `ssot/`
builds nothing. It does not run `nx affected -t build` with `-p`: `affected` has
no include filter, and the `-p` is forwarded to the build itself, where it
reaches `tsc` as a project path. Nx runs every selected build even when one
fails, so one red app still reports the others.

The price is that the deploys share a gate. A failed build of one app on
`develop` now holds back all four deploys, not only its own. That push has
already built green on its pull request, so the case is rare, and it fails
closed.

The three web apps still deploy through three independent deploy jobs to three
hosting sites. They are not one job with three targets: a failure deploying one
app must not hold the other two back, and the consumer app is the only one under
release-candidate scope, so it is the only one that sets
`NX_APP_BITE_TRIBE_APP_CHECK_ENFORCED` and runs `release:verify-bundle`.

`build` compiles the Firebase functions and `deploy-functions` ships
them, so backend behaviour reaches production on the same push as the web bundle
that calls it. Until [issue #1464][#1464]
the pipeline built them and threw the result away, and the deploy was a command
someone remembered to run on a workstation - which meant a merged function could
sit undeployed indefinitely, and the artifact came from whatever state that
machine was in rather than from the commit CI verified.

Four decisions shape the backend deploys, and none of them is the obvious one.
Two of them are no longer about `deploy-functions` at all: [issue #1567][#1567]
gave the rules and the indexes jobs of their own, and what was a note about why
a deploy was missing is now a note about how it is gated.

**They share one service account.** `FIREBASE_SERVICE_ACCOUNT_BITE_TRIBE_FUNCTIONS`,
provisioned by `tools/set-functions-deploy-service-account.sh`, is used by all
three backend deploys and is not the `FIREBASE_SERVICE_ACCOUNT_BITE_TRIBE` the
three hosting deploys share. A gen2 deploy needs Cloud Run, Artifact Registry,
Cloud Build, Eventarc, Cloud Scheduler and Secret Manager admin, and putting all
of that on the credential that otherwise publishes static files makes one leaked
secret worth far more. The rules and index deploys add `firebaserules.admin` and
`datastore.indexAdmin` to it; the script's role list is where the reasoning for
each role lives. The secret keeps its `_FUNCTIONS` name from when functions were
the only backend deploy, because renaming it means the repository settings and
every job at once.

**Firestore and Storage rules deploy from `develop`, gated on their own test
suite.** `firestore-rules` runs the emulator suite over
`apps/bite-tribe-firebase/firestore.rules` on every pull request, and
`deploy-firestore-rules` needs it, so a ruleset that fails the suite is never
published. Both files go in one command, `--only firestore:rules,storage`. The
test job installs the functions package as well as the workspace root: the suite
needs `@firebase/rules-unit-testing` from the first and jest, ts-jest and the
Firebase client SDK from the second.

The deploy was manual until [issue #1567][#1567], on the argument that a rules
deploy takes effect the moment it lands and cannot be staged. It still cannot.
What that argument does not survive is [issue #1078][#1078] - the rules change
merged on 9 September 2026 went live only when someone ran the workstation
command, and nothing in the repository, the pipeline or a pull request said so
in between. An unstageable deploy is a reason to gate the deploy on a test, not
a reason to leave production behind the tested file. The gate is the `needs`
edge above; the rules section on
[Architecture - Firebase](../architecture/firebase.md) carries the rollout and
rollback story.

**Firestore indexes deploy from `develop` too, in a job that then waits for the
build.** `firebase deploy --only functions` never touches them, and the
Firestore API builds an index in the background while the CLI returns
immediately - so deploying an index is not the same as having one, and a
function whose query needs one still in `CREATING` fails in production with
`FAILED_PRECONDITION`. That is [issue #1227][#1227].

`deploy-firestore-indexes` therefore does two things, and the second is the one
that matters: it deploys the specification, then runs
`npm run firestore:assert-indexes-ready`, which polls until every index and
field override `apps/bite-tribe-firebase/firestore.indexes.json` declares is
present and `READY`. `deploy-functions` needs that job, which is what enforces
the ordering the manual process relied on someone remembering.

The wait is a rewrite of the old preflight, not a rename of it. That version
read deployed state through `firebase-tools`' `firestore:indexes` command, whose
`makeIndexSpec` builds the shape of the specification file and drops `state` on
the way, so it could not tell a finished index from one still building. Adding
a deploy in front of a presence check would have made it pass instantly on
exactly the index it exists to catch. `tools/assert-firestore-indexes-ready.mjs`
reads the Firestore Admin API directly instead.

Two details of that read are worth keeping, because the obvious guess is wrong
on both. The Admin API reports `state` on composite indexes **and** on every
index inside a field override, so exemptions are covered directly - it is
`firebase firestore:indexes --pretty` that prints no build state for them, not
the resource that lacks one. And a live composite index always carries a
trailing `__name__` field that `firestore.indexes.json` never declares, because
`firebase deploy` appends it to the committed specification on the way out; both
sides have to be normalised before they are compared. The wait also polls the
database's long-running operations as a second signal, which covers the window
where a build has been requested but the index is not listable yet.

An index build is proportional to the data already in the collection, so the
wait is bounded: it fails the job rather than holding a deploy open, and
re-running it once the build finishes passes with no code change.

**A failed deploy fails the run, and nothing more.** There is no
`continue-on-error`, and the hosting deploys do not wait for this job. A
functions deploy that fails after three successful hosting deploys therefore
leaves a live frontend calling backend code that is not there, and the recovery
is to re-run the job or deploy locally. Serialising the web deploys behind this
one would trade that window for a functions problem blocking every web deploy,
which is the worse of the two on a repository where the web deploy runs about a
hundred times a month.

See [Implementation - Firebase Functions](firebase-functions.md).

The lint, stylelint and tests chain is deliberately sequential so a cheap failure stops the run before the expensive jobs start. Everything after `tests` fans out in parallel.

`report` posts a single sticky PR comment with the E2E and Loki results. It runs with `if: !cancelled()` so a failing job is still reported. A `loki` run that skipped its capture because no story was affected reports as passed, because the job itself succeeded. `loki` is the aggregate of `loki-build` and both `loki-capture` legs, so the comment shows one Loki result that is red if either configuration failed (see [Loki Captures Each Configuration On Its Own Runner](#loki-captures-each-configuration-on-its-own-runner)).

## Composite Actions

| Action                                   | Used by                                                                                 | Responsibility                                                                              |
| ---------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `.github/actions/setup`                  | `setup`, deploys, standalone workflows                                                  | Restore `node_modules`, set up Node.js from `.nvmrc`; on a miss `npm ci` and save the cache |
| `.github/actions/restore-cache`          | Every pipeline job                                                                      | Exact-key restore of `node_modules`, no fallback; exposes `cache-hit`                       |
| `.github/actions/install-if-missing`     | `build`                                                                                 | `npm ci` when the restored `node_modules` is unusable                                       |
| `.github/actions/setup-env-for-affected` | `lint`, `stylelint`, `test-shard`, `loki-build`, `build`                                | Derive `NX_BASE` and `NX_HEAD` through `nrwl/nx-set-shas`                                   |
| `.github/actions/nx-cache`               | `lint`, `stylelint`, `test-shard`, `build`, `loki-build`, `deploy-bite-tribe-storybook` | Persist and restore the Nx computation cache; `key-suffix` separates the legs of a matrix   |
| `.github/actions/playwright-chromium`    | `e2e-shard`, `business-e2e`                                                             | Restore Playwright's Chromium by version; install system packages only if it cannot launch  |

`setup` reads `cache-hit` from `restore-cache` through the step id `cache`. On a hit it skips `npm ci` and the save, and sets up Node.js without the npm download cache, which only `npm ci` uses. Node.js itself is still set up from `.nvmrc` because the deploy jobs build through this action. Before [#1811] the step had no id, so the guards were always true and every run reinstalled the `node_modules` it had just restored.

## Action Versions

**This page owns the versions of the GitHub Actions used in CI.** Not
[Current State - Nx And Dependency Migration Roadmap](../current-state/nx-and-dependency-migration-roadmap.md), which pins Node and Nx:
that page describes a migration with an end state, while action versions are a
permanent property of the workflows, and this page already owns the workflow
inventory and the composite actions that call them.

Current, as of the bump under
[issue #1437][#1437].
Every one declares `using: node24`.

| Action                      | Version | Uses |
| --------------------------- | ------- | ---- |
| `actions/checkout`          | v7      | 22   |
| `actions/upload-artifact`   | v7      | 6    |
| `actions/setup-java`        | v6      | 3    |
| `actions/setup-node`        | v7      | 2    |
| `actions/download-artifact` | v8      | 2    |
| `actions/cache`             | v6      | 2    |
| `actions/cache/restore`     | v6      | 1    |
| `actions/github-script`     | v9      | 1    |

Third-party actions are versioned by their own projects and are not in this
table: `FirebaseExtended/action-hosting-deploy`, `r0adkll/upload-google-play`,
`nrwl/nx-set-shas`, `codecov/codecov-action`.

### How Drift Is Noticed

`.github/dependabot.yml` opens one grouped pull request a month when any of
them moves. That is the mechanism, and the choice of a mechanism over a
documented cadence is the same reasoning that puts every deploy in
`pipeline.yml`: nothing reminds anyone to perform a review, so a review that
depends on remembering does not happen. Seven actions went stale before anyone
looked, and what surfaced it was a runner deprecation warning.

A grouped pull request is a prompt, not an instruction. A major bump still needs
its breaking changes read before it is merged.

### What A Bump Has To Preserve

Two behaviours in `native-release.yml` are load-bearing and neither is obvious
from a diff. During issue [#1181] an artifact was staged as a dotfile and dropped
in silence while the step reported success, and the guard added afterwards
assumes both:

- `actions/upload-artifact` **excludes hidden files by default**. In v7 that is
  `include-hidden-files`, default `false`.
- `if-no-files-found: error` still fails the step rather than warning.

`actions/download-artifact` v8 changed one default in the other direction: a
digest mismatch now fails the run instead of logging a warning, configurable
through `digest-mismatch`. That is the safer default and it is kept.

## Caching Layers

Five independent caches, each with its own key:

| Cache               | Path                              | Key                                                                               |
| ------------------- | --------------------------------- | --------------------------------------------------------------------------------- |
| Dependencies        | `node_modules`                    | `node-modules-<package-lock hash>`                                                |
| npm download        | npm's own cache directory         | `node-cache-<os>-npm-<package-lock hash>`                                         |
| Nx computation      | `.nx/cache`, `.nx/workspace-data` | `nx-cache-v2-<os>-<run id>-<job>`, restored by the `nx-cache-v2-<os>-` prefix     |
| Playwright browsers | `~/.cache/ms-playwright`          | `playwright-chromium-<os>-<ImageOS>-<@playwright/test version>`                   |
| Jest transforms     | `tmp/jest-cache`                  | `jest-cache-v1-<os>-<package-lock hash>-<shard>`, restored by the lockfile prefix |

The Nx key is unique per run and job so every job saves its own entry - a matrix leg appends its `key-suffix`, because the legs share one job id - while the `restore-keys` prefix pulls the most recent entry from any earlier job or run. Nx keys its own entries by content hash, so restoring a slightly stale cache is safe: matching tasks are replayed and everything else is recomputed.

### Playwright Browsers Without apt

`e2e-shard` and `business-e2e` get Chromium through
`.github/actions/playwright-chromium`. Until [issue #1818][#1818] both ran
`npx playwright install --with-deps chromium` on every run. That usually took 21
to 44 seconds, but the `apt-get` half of `--with-deps` took 610 s and 729 s on
two of eleven pull-request runs when the package mirror was slow.

The action caches `~/.cache/ms-playwright` under the version read from the
installed `@playwright/test`. A bump therefore misses the cache, and the next run
downloads the new browser with `playwright install chromium`, which fetches the
browser without system packages. It then launches Chromium once. The runner
image ships Google Chrome, whose packages cover what Playwright's Chromium links
against, so the launch normally succeeds and `apt` never runs. Only if it fails,
for example after a runner image drops a library, does the action run
`playwright install-deps chromium` and warn in the run summary.

The alternative was running both jobs in the `mcr.microsoft.com/playwright`
image for the pinned version. It was rejected because the image is about 930 MB
compressed (`v1.61.1-noble`, amd64), and it is pulled on every run whether or
not anything changed. The cache costs one download per Playwright bump. The
container's tag would also have to be bumped by hand alongside `package.json`,
and its Node.js is not the version in `.nvmrc`.

## Nx Cache Mechanics

The Nx cache is two things in two directories, and both must be cached together:

- `.nx/cache` holds the task **artifacts**: outputs and captured terminal output.
- `.nx/workspace-data/<machine-id>-v<schema>.db` is the SQLite **index** that maps a task hash to an artifact.

Cache lookups go through the index only. There is no filesystem fallback to `.nx/cache`, so caching the artifacts without the index produces a 0% hit rate: every task re-runs and the restored artifacts are dead weight. This was the state of CI until the index was added to the cached paths.

Nx names the index after the machine id of the host that wrote it, reading `/var/lib/dbus/machine-id` and falling back to `/etc/machine-id`, and exposes no override for the name. A runner whose machine id differs from the one that saved the cache would ignore the restored index and open an empty one, so the `nx-cache` action renames the restored database to the name the current runner will look for. The SQLite write-ahead log is renamed with it; the shared-memory and lock files are dropped because they are rebuilt.

`NX_MAX_CACHE_SIZE` caps `.nx/cache` in `pipeline.yml`. Nx would otherwise size it against free disk on the runner, which was harmless while the directory was rebuilt every run but is not once it genuinely accumulates. The repository shares a 10 GB GitHub Actions cache budget across all entries.

## Affected Computation

`lint`, `stylelint`, `test-shard` and `build` run through the affected set; `loki-build` reads it to decide whether to capture. E2E runs unconditionally.

`build` is also the only type check for the Firebase functions, so gating it on affected is safe only because affected selects `functions` for everything that can break the compile. Checked for [issue #1819][#1819]: its own sources and package files, a root dependency it imports (`firebase-admin`), the workspace `typescript` and `@types/node`, `tsconfig.base.json` and `nx.json` each select it, and a change confined to `ssot/` or to `apps/bite-tribe-firebase/firebase.json` does not. The functions compile cannot read a workspace library, because its `tsconfig.json` sets `rootDir: src` and does not extend `tsconfig.base.json`.

`pipeline.yml` sets `NX_BASE: develop` as a workflow-level default. `nrwl/nx-set-shas` then writes the resolved `NX_BASE` and `NX_HEAD` SHAs to `GITHUB_ENV`, which takes precedence for the steps that follow, so the affected jobs compare against the real merge base rather than the branch name. Jobs that need affected must therefore run `setup-env-for-affected` before the Nx command.

Every checkout in `pipeline.yml` uses `fetch-depth: 0` because affected needs full history.

### Loki Runs Only When A Story Is Affected

Loki captures only when `storybook-host` is in `nx show projects --affected`.
`loki-build` makes that check. Otherwise it skips the build, both capture legs
skip their steps, and all three jobs still succeed, so `report` and
the required check stay green. Until [issue #1815][#1815] it captured all 846
references on every pull request, at a median of 9.3 minutes, including pull
requests that touched only `ssot/` or a workflow.

The gate reads the project graph rather than path filters, which only works
because the graph was made to say what a capture reads. Three things had to
change, and each was a real gap rather than a precaution:

- **Every app with a story is an implicit dependency.** `storybook-host`
  imports nothing from the business and admin apps, so before [#1815] it reached
  none of their libraries. That left 21 story files in 14 projects, and the two
  apps' Transloco catalogues the Storybook serves, outside both the gate and the
  build's cache key. `implicitDependencies` now names `bite-tribe`,
  `bite-tribe-business` and `bite-tribe-admin`, which covers every project but
  the Firebase functions, the e2e suites, the native wrappers, `chart` and `cv`.
- **Files outside any project are declared as inputs.** Nx counts a
  `{workspaceRoot}/…` target input as touching that project. `build-storybook`
  declares the brand characters under `ssot/assets/characters`, which a story
  renders, and `libs/bite-tribe-common/styles`, which the build reaches through
  `stylePreprocessorOptions` and no project owns. It also declares `world-atlas`
  as an external dependency, because the build copies its files without any
  project importing it.
- **A `loki` target declares what the capture reads.** `storybook-host:loki`
  runs `node tools/loki.mjs test` after `build-storybook` and is not cached. Its
  inputs add `.loki/reference`, `loki.config.js`, `tools/loki.mjs` and
  `package.json`, so a pull request that only adopts references, changes the
  runner or bumps a dependency still captures. `package.json` is the broad one,
  kept deliberately: a bump to `loki` or `world-atlas` would otherwise affect
  nothing.

The check runs outside any condition, so an Nx failure fails the job rather than
reading as "not affected".

On `develop`, `nrwl/nx-set-shas` compares against the last successful run, so a
skipped capture means no story changed since stories last passed.
`deploy-bite-tribe-storybook` therefore still runs unconditionally after `loki`.

### Loki Captures Each Configuration On Its Own Runner

`loki.config.js` defines two configurations, `chrome.laptop` and
`chrome.iphone7`. Until [issue #1816][#1816] both were captured in one
`npm run loki:test` on one runner, which took 6 to 9 minutes after the Storybook
build. They now capture in parallel, over three jobs:

- **`loki-build`** runs the affected check, builds Storybook once through the Nx
  cache, and uploads `dist/storybook/storybook-host` as the `loki-storybook`
  artifact. The capture legs download it rather than building it again.
- **`loki-capture`** is a matrix with one leg per configuration. Each leg runs
  `npm run loki:test -- --configurationFilter "^<configuration>$"`;
  `tools/loki.mjs` passes the argument through to the Loki CLI. The legs run
  with `fail-fast: false`, so a pull request sees every changed reference in one
  run, and each uploads its own `loki-diffs-<configuration>` artifact on
  failure.
- **`loki`** needs both and passes only when `loki-build` and every leg
  succeeded. `report` and `deploy-bite-tribe-storybook` read this job, so
  neither depends on how many configurations exist.

The legs always run and skip their steps when no story is affected, so an
unaffected pull request shows two green legs rather than two skipped ones.

Each leg first checks that its matrix entry names a configuration in
`loki.config.js`. Loki exits 0 with "No matching configurations" when the filter
matches nothing, so a matrix entry that drifted from the config, or a renamed
configuration, would otherwise pass without capturing anything. A configuration
added to `loki.config.js` must be added to the matrix as well; nothing fails if
it is not, and it is simply never captured in CI.

### The Consumer E2E Suite Runs As Three Shards

Until [issue #1817][#1817] `e2e` ran all 49 consumer tests on one Playwright
worker. The emulators and dev server were up about 45 seconds into the job, and
the tests then took 7.0 minutes, for a median job of 8.5 minutes. The suite now
runs over two jobs, in the same shape as Loki:

- **`e2e-shard`** is a matrix over `shard: [1, 2, 3]` with `fail-fast: false`.
  Each leg runs `nx e2e bite-tribe-e2e --shard=<n>/3`, boots its own emulators
  and dev server, and uploads `playwright-report-<n>`. The reports are not
  merged; the `report` comment names all three.
- **`e2e`** needs the matrix and passes only when every shard did. `report`
  reads this job, so it keeps one consumer e2e row however many shards there
  are, and the check name `e2e` is unchanged.

The suite shards across jobs rather than raising `workers`, because the specs
share one emulator's data and several create users, bites and table sessions.
A shard has the emulator to itself and starts from the seeded export.

Playwright splits by test, not by file, because `nxE2EPreset` sets
`fullyParallel`. A file can therefore land in two shards, which is safe only
because every spec seeds what it reads; a `test.describe.configure({ mode:
'serial' })` block always stays in one shard. A spec that depends on an earlier
test in its file must be made `serial`, or it passes only when the split
happens to keep the two together.

Shard 1 of 3 reproduces locally with
`npx nx e2e bite-tribe-e2e --workers=1 --shard=1/3`, and `--list` shows which
tests a shard holds without starting the emulators.

`business-e2e`, at a median of 2.4 minutes, stays one job.

### The Unit Tests Run As Four Shards

Until [issue #1813][#1813] one `tests` job ran `nx affected -t test`. It took
under 1.5 minutes when few projects were affected and 10 to 14 minutes when a
shared library was: in run 40863200582, 67 projects took 591 seconds of
wall-clock time and 1,655 seconds of summed Jest time. Nx ran three projects at
a time on the four-vCPU runner and every Jest process started `cpus - 1`
workers, so about nine workers competed for four cores, and the Jest transform
cache sat in `/tmp` and was thrown away with the runner. The job is now two, in
the same shape as `e2e`:

- **`test-shard`** is a matrix over `shard: [1, 2, 3, 4]` with
  `fail-fast: false`. Each leg lists `nx show projects --affected
--withTarget=test`, sorts it, keeps every fourth project starting at its own
  index, and runs them with `nx run-many -t test -c ci --parallel=2
--maxWorkers=2`. A leg whose share is empty skips its run and its upload.
- **`tests`** needs the matrix and passes only when every leg did. Every job
  after the unit tests needs `tests`, so none of them depends on the shard
  count, and the check name is unchanged.

The legs agree on the split without a job to hand it out, because each sorts the
same list. The split is by count, not by cost: Jest's time on CI follows a
project's module graph more than its spec count, and `bite-tribe-business/floor-plan`
with ten spec files was the slowest project in the run above. Balance the
shards with recorded timings only if one leg is consistently the long pole.

Two projects at a time with two workers each fills the runner's four vCPUs. The
`ci` configuration of the `test` target in `nx.json` adds `--ci`, which fails a
missing snapshot instead of writing it, and `--coverage`.

Measured on the pull request that made the change, run 41183078451, which
affected 115 Jest projects because it edited `jest.preset.js`. Every Jest cache
was cold, so this is the slow case:

| Figure                                          | One job, run 40863200582 | Four shards, run 41183078451 |
| ----------------------------------------------- | ------------------------ | ---------------------------- |
| Projects run                                    | 67                       | 115                          |
| Unit-test wall-clock, stylelint done to `tests` | 10.4 min                 | 4.0 min                      |
| Longest leg's test step                         | 591 s                    | 192 s, shortest 130 s        |
| Summed Jest time, the 63 projects in both runs  | 1,658 s                  | 875 s                        |
| `bite-tribe-business/floor-plan`                | 98 s                     | 34 s                         |

The per-project halving is the worker sizing alone, because neither run had a
transform cache. Codecov merged the four uploads into one report of 702 files.

`jest.preset.js` sets `cacheDirectory` to `tmp/jest-cache`, which each leg
persists with `actions/cache` keyed on the lockfile and its shard. Jest keys
every transform by content, so a cache restored from an older commit is safe;
the lockfile key is for the Angular and Ionic `.mjs` files under
`node_modules`, which are the expensive transforms and change only with it. A
key that exists is never saved again, so the cache holds what the first run on a
lockfile transformed, and a project that was not affected then is transformed
afresh on every run until the lockfile moves.

Codecov merges every upload for a commit, so each leg uploads its own projects
under the same `unittests` flag and the report covers every affected project.

## Build-Time Environment Variables

Nx task hashes do **not** include the `NX_APP_*` build-time variables. They are not declared as `env` inputs in `nx.json`, so two builds that differ only in those values share a task hash and Nx will replay either artifact for the other.

This is why the `deploy-bite-tribe`, `deploy-bite-tribe-business` and `deploy-bite-tribe-admin` jobs rebuild through the `setup` action instead of restoring the Nx cache: they are the only jobs that build with the production secrets, and a shared cache would let the secret-free bundle from `build` be replayed into a deploy, or the reverse. It is also why a deploy still runs when `build` skipped its app as unaffected: the deploy never used that artifact.

Each app reads its own `authDomain` secret — `NX_APP_BITE_TRIBE_AUTH_DOMAIN`, `NX_APP_BITE_TRIBE_BUSINESS_AUTH_DOMAIN`, `NX_APP_BITE_TRIBE_ADMIN_AUTH_DOMAIN`. All three hold the same value today, the project's shared `bite-tribe.firebaseapp.com` OAuth handler. They are separate secrets because `authDomain` is what Firebase builds the Google and Apple redirect from, so one app can later be moved to its own handler domain without moving the other two.

The three deploy jobs do **not** pass the same set. `NX_APP_BITE_TRIBE_MEASSUREMENT_ID` reaches `deploy-bite-tribe` and the native release, and reached `deploy-bite-tribe-business` only from issue [#1588] - the table operations of [#1098] are the first events that app sends, and until then it had no analytics to need one. `deploy-bite-tribe-admin` still omits it deliberately: nothing in the admin app emits a product event, and `AnalyticsService` initializes analytics lazily on the first one, so it initializes none.

The failure mode is worth knowing, because it is silent. Without `measurementId` in the Firebase options the web SDK recovers one from a runtime `webConfig` fetch keyed on the app id, and if that fetch does not answer, `getAnalytics()` throws inside `AnalyticsService.emit`, which swallows it by design - tracking must never break a user flow. So the app works, the events do not arrive, and nothing says so. An app that emits events states the value rather than trusting the recovery.

`deploy-bite-tribe-storybook` is not subject to this. The Storybook build reads no `NX_APP_*` variables, so it needs no secrets and its artifact is the same whichever job produced it. That is why `loki-build` and the deploy share it through `nx-cache`, and on `develop` the deploy replays the build `loki-build` cached a few minutes earlier rather than building it a second time.

One file in that build is not covered by the hash. `npm run build:storybook` writes `nxgraph.html`, the page the `Tech/Graph` story frames, before the build, and the file is gitignored, so Nx does not hash it. A cache hit replays the graph of whichever run cached the build. Loki is unaffected, because the reference for that story captures a blank frame. The deploy copies the freshly generated graph over the restored build before it publishes.

See [Implementation - Release And Build Workflow](release-and-build-workflow.md) for how the values reach the bundle and which of them are public by design, and [Current State - Known Issues](../current-state/known-issues.md) for the deliberately misspelled `NX_APP_BITE_TRIBE_MESSAGINX_SENDER_ID` secret name.

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
configuration that [Implementation - Release And Build Workflow](release-and-build-workflow.md) records as
public by design.

The one thing a public repository genuinely exposes is `ssot` itself: the
release-candidate charter, [Current State - Known Issues](../current-state/known-issues.md), and the open
findings, in detail. If visibility is ever revisited, that is the argument.
It is a disclosure decision, not a cost or a security-of-signing one, and it
costs about `$40` a month to act on.

### Not The Answer

A self-hosted macOS runner would avoid the multiplier, and it would put the
store artifact back on one machine's toolchain and signing state - which is the
thing [issue #1181][#1181]
exists to remove. If the bill ever needs cutting, cut it in the pipeline first;
the Nx-cache gaps under Current Limitations are the larger lever.

## Rules

- Cache `.nx/cache` and `.nx/workspace-data` together. Either one alone is useless.
- Bump the Nx cache key prefix whenever the set of cached paths changes. Old entries can never produce a hit and would only be restored as dead weight.
- Do not add the `nx-cache` action to a job that builds with a different `NX_APP_*` set than the other jobs, unless those variables are first declared as `env` inputs in `nx.json`.
- Run `setup-env-for-affected` before any `nx affected` command, and keep `fetch-depth: 0` on its checkout.
- Keep every file a story renders inside `storybook-host`'s graph or its target inputs. A story in a project the graph does not reach, or a file outside any project that the build or the capture reads, is skipped by the `loki` gate and left out of the build's cache key. Check a new one with `nx show target inputs storybook-host:build-storybook`.
- Verify a caching change by reading the `Cache: <hits>/<total> hit` line that Nx prints at the end of each run. The first run after a key change is always 0%; the second run on the same branch is the real signal.
- Pull requests read the cache scope of the default branch. A cache written by a pull request is visible only to that pull request, so a new caching behavior only proves itself once `develop` has run with it.
- Size Jest's workers to the runner. `test-shard` runs `--parallel=2` with `--maxWorkers=2` on four vCPUs; raising either without lowering the other oversubscribes the cores, which is what made the unit tests 2.5 times slower on CI than on a laptop.
- Keep the E2E jobs on separate runners, and each consumer shard on a runner of its own. Every suite and shard drives the same Firebase emulator ports and would fight over them in one job, and a shard is only isolated because it starts its own emulators from the seeded export. Shard across jobs; do not raise Playwright `workers` against one emulator.
- Add a new deploy to `pipeline.yml` behind `if: github.ref == 'refs/heads/develop'`. Do not give it a manually dispatched workflow of its own. A separate workflow needs a trigger that fires on its own, as `native-release.yml`'s tag does.
- Never put `continue-on-error` on a deploy job. A deploy that is allowed to fail quietly is the manual deploy again, with extra steps.
- Give a deploy the narrowest credential that can perform it, and grant a new permission to that deploy's own service account. Widening `FIREBASE_SERVICE_ACCOUNT_BITE_TRIBE` is how a hosting secret ends up worth a project.
- Deploy a new Firestore index before the function that queries through it, and wait for it to reach `READY`. `deploy-functions` needs `deploy-firestore-indexes`, which does both, so this is enforced rather than remembered. See [Implementation - Firebase Functions](firebase-functions.md).
- Do not pass `--force` to the index deploy. `--non-interactive` alone logs and skips an index that the project has and the file does not; `--force` deletes it. An undeclared index in production costs storage, and rebuilding a deleted one costs a query outage, so removal stays a deliberate local command.
- Pair any new backend deploy with the test that can refuse it, as a `needs` edge. `deploy-firestore-rules` needs `firestore-rules` and `deploy-functions` needs `deploy-firestore-indexes`. A deploy job whose only gate is the `develop` guard is a scheduled accident.
- Keep every `actions/*` use on the version this page's table names, and update the table in the same pull request that moves one. A version that appears in a workflow and not in the table is drift by definition.
- Read a major bump's breaking changes before merging the Dependabot pull request. Grouped means one review, not no review.
- Do not use `.github/actions/setup` or `.github/actions/restore-cache` from a macOS or Windows job. The `node_modules` cache key is `node-modules-<package-lock hash>` with no runner OS in it, so a non-Linux job would restore Linux native binaries, and saving would overwrite the entry every other job depends on. Use `actions/setup-node` and `npm ci` directly, as the `ios` job does.
- Keep local and CI Node.js versions aligned through `.nvmrc` as defined by [Current State - Nx And Dependency Migration Roadmap](../current-state/nx-and-dependency-migration-roadmap.md).
- Price a change of repository visibility before making one. CI is free because the repository is public, and going private starts a bill dominated by `pipeline.yml` rather than by the native jobs. See Repository Visibility And Actions Cost above.
- Do not add a self-hosted runner to escape a minute multiplier. It reintroduces the single-workstation build that issue [#1181] removed.

## Code Anchors

```text
.github/workflows/pipeline.yml
apps/storybook-host/project.json
.github/workflows/deploy-cv.yml
.github/workflows/analytics-digest.yml
.github/workflows/native-release.yml
tools/assert-release-bundle.mjs
tools/assert-firestore-indexes-ready.mjs
tools/set-functions-deploy-service-account.sh
.github/dependabot.yml
tools/write-build-provenance.mjs
apps/bite-tribe-ios/ios/App/ExportOptions.plist
.github/actions/nx-cache/action.yml
jest.preset.js
.github/actions/setup/action.yml
.github/actions/restore-cache/action.yml
.github/actions/install-if-missing/action.yml
.github/actions/setup-env-for-affected/action.yml
.github/actions/playwright-chromium/action.yml
nx.json
.nvmrc
```

## Current Limitations

- `e2e-shard` and `business-e2e` do not restore the Nx cache, so the E2E app builds re-run on every pipeline run, and since [issue #1817][#1817] the consumer dev server is built once per shard. They build with `NX_APP_BITE_TRIBE_IS_DEV=true` and fall under the environment-variable rule above. `loki` and `deploy-bite-tribe-storybook` were in this list until [issue #1815][#1815], which put both Storybook builds on the cache. Before that, `develop` built the Storybook twice, at roughly 80 seconds each.
- Only `build` carries `install-if-missing`. Every other job restores `node_modules` with an exact key and no fallback, so a cache miss or an unreachable cache service fails them with `nx: not found` instead of installing.
- There is no remote cache. Nx Cloud's free tier is exhausted too quickly for this workspace, and the self-hosted cache plugins (`@nx/gcs-cache` and siblings) are deprecated over CVE-2025-36852, an unpatchable cache-poisoning design flaw. The GitHub Actions cache is used instead, and its branch scoping provides the isolation those plugins lack.
- The native jobs in `native-release.yml` have never run. The Android and iOS signing secrets are not provisioned, so the workflow is written and reviewed but unexecuted, and the manual workstation release in [Implementation - Store Release Steps](store-release-steps.md) is still the one that produces store artifacts. See [Current State - Release Candidate Test Charter](../current-state/release-candidate-test-charter.md).
- `native-release.yml` builds on whatever Xcode `macos-latest` carries. An artifact is reproducible against a commit, not against a toolchain.
- The two jobs that compile the Firebase functions use different compilers. `build` does not install the functions package, so it compiles with the workspace TypeScript 6; `deploy-functions` installs it and therefore compiles with the `^5.7.3` that package pins, which is also what a workstation deploy uses. An error only one of them reports passes the pull request and fails the deploy. The version split is described in [Current State - Nx And Dependency Migration Roadmap](../current-state/nx-and-dependency-migration-roadmap.md).
- A second push to `develop` cancels a functions deploy in flight. The workflow-level `cancel-in-progress` supersedes the whole run, and a job-level `concurrency` group cannot override that; it only keeps a deploy started from another run from overlapping. A cancelled gen2 deploy leaves the already-updated functions updated, and the next push deploys the rest.
- CI never deletes a function. `--non-interactive` turns the deletion prompt into a failure, so removing an export from `src/index.ts` makes the deploy fail rather than silently take a live endpoint away. Delete it locally and deliberately, then push.
- Gen2 functions have no rollback. Recovery from a bad deploy is a forward deploy of the reverted commit, not a console action.
- **The emulator suite has one rare flake, and it is in the test that races two writes.** `table-orders.emulator-spec.ts`'s "creates one order when both copies arrive together" failed twice in roughly twenty local full-suite runs while [issue #1681][#1681] was being worked, and could not be reproduced under deliberate CPU load or by running that spec alone thirty times. Both failures followed back-to-back `emulators:exec` invocations, which a CI run does not do - it starts one emulator, runs the suite once, and exits. Recorded because a job that goes red at random teaches people to ignore it, so if `functions-emulator` starts flaking on pull requests, this is the first place to look and the flake is older than the job.
- One Node 20 deprecation warning cannot be removed from this repository. `codecov/codecov-action@v5` pins `actions/github-script` at v7.0.1 by commit SHA, so every `test-shard` leg reports the warning no matter what versions this page's table holds. It is Codecov's to fix, v5 is their latest, and the run is not affected - the runner executes the action on Node 24 regardless.

## Related Pages

- [Architecture - Nx Workspace](../architecture/nx-workspace.md)
- [Implementation - Release And Build Workflow](release-and-build-workflow.md)
- [Implementation - Testing](testing.md)
- [Current State - Nx And Dependency Migration Roadmap](../current-state/nx-and-dependency-migration-roadmap.md)
- [Current State - Release Candidate Test Charter](../current-state/release-candidate-test-charter.md)

[#1078]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1078
[#1098]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1098
[#1181]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1181
[#1227]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1227
[#1437]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1437
[#1464]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1464
[#1567]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1567
[#1588]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1588
[#1681]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1681
[#1811]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1811
[#1813]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1813
[#1815]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1815
[#1816]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1816
[#1817]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1817
[#1818]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1818
[#1819]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1819
[#1839]: https://github.com/muhammedgaygisiz/travellers-apps/pull/1839
