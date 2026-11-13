# tools

Repository scripts. Every one is plain Node or shell with no build step, and the
canonical way to run one is its `npm run` script — a path here may move, a script name
is what the SSOT and CI cite.

The column that matters most is **writes**: a script that writes into `ssot/` is a
generator, and hand-editing what it produces is undone on its next run. If a page's
content is generated, change the generator.

## Writes into `ssot/`

| Script                          | `npm run`               | Writes                              | Does                                                                                                                                                                                                                                                                              |
| ------------------------------- | ----------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `generate-launch-post.mjs`      | `generate-launch-post`  | `ssot/marketing/assets/social/`     | Composes the Instagram launch post from the brand artwork                                                                                                                                                                                                                         |
| `generate-traceability-map.mjs` | `generate:traceability` | `ssot/overview/traceability-map.md` | Rewrites `Domain To Use Cases` and `Use Cases To Epics` from each use case's `Related Domains` and `Related GitHub Scope`. It owns only the block between `<!-- generated:traceability:start -->` and `<!-- generated:traceability:end -->`; the rest of the page is hand-written |

## Release and build

| Script                                              | `npm run`                                       | Does                                                                                                   |
| --------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `increment-build-number.mjs`                        | `increment-build-number`                        | Moves the native build number                                                                          |
| `increment-build-number-and-generate-changelog.mjs` | `increment-build-number-and-generate-changelog` | Both of the above in the order the release workflow needs                                              |
| `write-build-provenance.mjs`                        | `release:provenance`                            | Writes `dist/build-provenance.json`, recording what a native build was made from                       |
| `sync-native-version.mjs`                           | `sync-native-version`                           | Pushes the `package.json` marketing version into the native projects                                   |
| `native-version.mjs`                                | —                                               | Library: the marketing version lives in `package.json` and nowhere else                                |
| `generate-changelog.mjs`                            | `generate-changelog`                            | Changelog for one build. `-- --tag <name>` adds the `Tag:` line; the release passes the tag it creates |
| `changelog-sections.mjs`                            | —                                               | Library: cuts two ranges out of a build's changelog section                                            |
| `release-notes.mjs`                                 | `release:notes`                                 | Prints the changelog range used for store build notes                                                  |
| `build-android-release.mjs`                         | `release:android`                               | Builds the Android release artifact under a JDK Gradle accepts                                         |
| `assert-release-bundle.mjs`                         | `release:verify-bundle`                         | Asserts a production web bundle is fit to be wrapped natively                                          |
| `set-native-release-secrets.sh`                     | —                                               | Sets the GitHub Actions secrets `native-release.yml` needs                                             |

## Checks

| Script                                    | `npm run`                                  | Does                                                                                               |
| ----------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `check-ssot.mjs`                          | `check:ssot`                               | Structural checks for the SSOT — see below. Runs in CI in the `lint` job, and a violation fails it |
| `assert-firestore-indexes-ready.mjs`      | `firestore:assert-indexes-ready`           | Waits for every declared Firestore index and exemption to reach `READY`                            |
| `loki.mjs`                                | `loki:test`, `loki:update`, `loki:approve` | Visual regression, wrapping `oblador/loki` directly                                                |
| `generate-geotagged-fixture.mjs`          | —                                          | Regenerates the geotagged e2e image fixture                                                        |
| `generate-store-qr-codes.mjs`             | `generate-store-qr-codes`                  | Redraws the two committed store QR codes under the consumer app's assets                           |
| `set-functions-deploy-service-account.sh` | —                                          | Provisions the service account the `deploy-functions` job uses                                     |

## Analytics

`analytics/` holds the launch-analytics tooling: `report.mjs` (`analytics:report`),
`digest.mjs` (`analytics:digest`), `provision-ga4.mjs` (`analytics:provision`),
`provision-bigquery.mjs` (`analytics:bigquery`) and `query.mjs` (`analytics:query`), over
the shared helpers in `ga4.mjs`, `bigquery.mjs` and `dashboard.config.mjs`. It has its
own [README](analytics/README.md).

## What `check:ssot` enforces

A failure makes the command exit non-zero. A warning is listed with the failures but
never changes the exit code; in CI it reaches the job summary and the pull request's SSOT
comment, which then says it does not block the merge.

| Rule         | Result                                   | Checks                                                                                                                                                                                                                                                                                                                                      |
| ------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LINK`       | failure                                  | A relative link points at a file that does not exist                                                                                                                                                                                                                                                                                        |
| `WIKILINK`   | failure                                  | A Logseq `[[wikilink]]` appears outside code                                                                                                                                                                                                                                                                                                |
| `ISSUEREF`   | failure                                  | An issue number is written so that it does not link (`\#1234`, or a bare `#1234`)                                                                                                                                                                                                                                                           |
| `REFDEF`     | failure                                  | A `[#1234]` reference has no definition in its own file                                                                                                                                                                                                                                                                                     |
| `LOGSEQ`     | failure                                  | A `key:: value` property, a page that opens as an outline bullet rather than a heading, or a heading written as an outline bullet (`- ## …`) anywhere in a file outside code                                                                                                                                                                |
| `PATH`       | failure                                  | A path in backticks starting `apps/`, `libs/`, `tools/` or `ssot/`, outside fenced code, names nothing in the working tree. `...` stands for any subpath; `*`, `**`, `<name>` and `{a,b}` match as a reader expects. Paths `git check-ignore` matches are exempt, and so are pages under `ssot/history/`, which describe the tree as it was |
| `ISSUESTATE` | failure                                  | A line in a use case's `Related GitHub Scope` ends in `Open` or `Closed`, with or without a full stop. The state of an issue lives on GitHub                                                                                                                                                                                                |
| `VERIFIED`   | failure if missing, warning if > 30 days | A page under `ssot/current-state/` carries no `**Last verified:** YYYY-MM-DD` line as the first line below its `#` heading, or carries one older than 30 days                                                                                                                                                                               |
| `GENERATED`  | failure                                  | The generated block of `ssot/overview/traceability-map.md` is not what `npm run generate:traceability` writes now: a use case's `Related Domains` or `Related GitHub Scope` changed without regenerating, or the block was edited by hand                                                                                                   |
| `ENTRY`      | warning                                  | `AGENTS.md` and the documents it lists under `## Always Read` exceed 3,500 words together. Fails instead if the section is missing or names a file that does not exist                                                                                                                                                                      |
| `MAPSIZE`    | warning                                  | `ssot/overview/traceability-map.md` exceeds 3,000 words                                                                                                                                                                                                                                                                                     |
| `UF-*`       | failure                                  | A use-case page breaks [Use Case Format](../ssot/overview/use-case-format.md) — level, required sections, section order, classification, related domains                                                                                                                                                                                    |

`PATH` reads the working tree through `git ls-files`, tracked and untracked, so it agrees
with CI on a case-insensitive file system and needs a git checkout to run.

Age is a warning rather than a failure because a blocking age check would fail unrelated
pull requests on the day a page turns 31 days old. Update the date only after reading the
page against the current state; a date bumped without reading is the drift this rule
exists to surface.

`ENTRY` and `MAPSIZE` count words as `wc -w` does. Every agent reads `AGENTS.md` and its
always-read documents before it reads its task, so each word there is paid on every task;
every feature and fix task reads the traceability map, whose generated block grows with each
use case. The budgets, 3,500 and 3,000 words, were set when the two stood at 2,864 and 2,050, and
leave room for ordinary growth. Going past one is a decision someone takes in
a pull request, by shortening what is read or by raising the budget here with the reason; it is
not something that should happen by accretion. They warn rather than fail so that the decision
stays possible.

Scripts that are libraries rather than entry points carry no `npm run` name and are
imported by their neighbours.
