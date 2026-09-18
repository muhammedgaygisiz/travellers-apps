# tools

Repository scripts. Every one is plain Node or shell with no build step, and the
canonical way to run one is its `npm run` script — a path here may move, a script name
is what the SSOT and CI cite.

The column that matters most is **writes**: a script that writes into `ssot/` is a
generator, and hand-editing what it produces is undone on its next run. If a page's
content is generated, change the generator.

## Writes into `ssot/`

| Script                        | `npm run`                 | Writes                                        | Does                                                               |
| ----------------------------- | ------------------------- | --------------------------------------------- | ------------------------------------------------------------------ |
| `generate-full-changelog.mjs` | `generate-full-changelog` | `ssot/releases/`                              | Rebuilds `changelog.md` and one `build-*.md` per tag from git tags |
| `write-build-provenance.mjs`  | `release:provenance`      | `ssot/current-state/`, `ssot/implementation/` | Records what a native build was made from                          |
| `generate-launch-post.mjs`    | `generate-launch-post`    | `ssot/assets/social/`                         | Composes the Instagram launch post from the brand artwork          |

## Release and build

| Script                                              | `npm run`                                       | Does                                                                    |
| --------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------- |
| `increment-build-number.mjs`                        | `increment-build-number`                        | Moves the native build number                                           |
| `increment-build-number-and-generate-changelog.mjs` | `increment-build-number-and-generate-changelog` | Both of the above in the order the release workflow needs               |
| `sync-native-version.mjs`                           | `sync-native-version`                           | Pushes the `package.json` marketing version into the native projects    |
| `native-version.mjs`                                | —                                               | Library: the marketing version lives in `package.json` and nowhere else |
| `generate-changelog.mjs`                            | `generate-changelog`                            | Changelog for one build                                                 |
| `changelog-sections.mjs`                            | —                                               | Library: cuts two ranges out of a build's changelog section             |
| `release-notes.mjs`                                 | `release:notes`                                 | Prints the changelog range used for store build notes                   |
| `build-android-release.mjs`                         | `release:android`                               | Builds the Android release artifact under a JDK Gradle accepts          |
| `assert-release-bundle.mjs`                         | `release:verify-bundle`                         | Asserts a production web bundle is fit to be wrapped natively           |
| `set-native-release-secrets.sh`                     | —                                               | Sets the GitHub Actions secrets `native-release.yml` needs              |

## Checks

| Script                                    | `npm run`                                  | Does                                                                     |
| ----------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------ |
| `check-ssot.mjs`                          | `check:ssot`                               | Structural checks for the SSOT — see below. Runs in CI in the `lint` job |
| `assert-firestore-indexes-ready.mjs`      | `firestore:assert-indexes-ready`           | Waits for every declared Firestore index and exemption to reach `READY`  |
| `loki.mjs`                                | `loki:test`, `loki:update`, `loki:approve` | Visual regression, wrapping `oblador/loki` directly                      |
| `generate-geotagged-fixture.mjs`          | —                                          | Regenerates the geotagged e2e image fixture                              |
| `generate-store-qr-codes.mjs`             | `generate-store-qr-codes`                  | Redraws the two committed store QR codes under the consumer app's assets |
| `set-functions-deploy-service-account.sh` | —                                          | Provisions the service account the `deploy-functions` job uses           |

## Analytics

`analytics/` holds the launch-analytics tooling: `report.mjs` (`analytics:report`),
`digest.mjs` (`analytics:digest`), `provision-ga4.mjs` (`analytics:provision`),
`provision-bigquery.mjs` (`analytics:bigquery`) and `query.mjs` (`analytics:query`), over
the shared helpers in `ga4.mjs`, `bigquery.mjs` and `dashboard.config.mjs`. It has its
own [README](analytics/README.md).

## What `check:ssot` enforces

| Rule       | Fails when                                                                                                                                               |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LINK`     | A relative link points at a file that does not exist                                                                                                     |
| `WIKILINK` | A Logseq `[[wikilink]]` appears outside code                                                                                                             |
| `ISSUEREF` | An issue number is written so that it does not link (`\#1234`, or a bare `#1234`)                                                                        |
| `REFDEF`   | A `[#1234]` reference has no definition in its own file                                                                                                  |
| `LOGSEQ`   | A `key:: value` property, or a page that opens as an outline bullet rather than a heading                                                                |
| `UF-*`     | A use-case page breaks [Use Case Format](../ssot/overview/use-case-format.md) — level, required sections, section order, classification, related domains |

Scripts that are libraries rather than entry points carry no `npm run` name and are
imported by their neighbours.
