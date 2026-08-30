# Release Workflow

## Purpose

This workflow describes the usual Sunday native release path for BiteTribe.

It turns the current build number into native app updates, then opens the next
development cycle by bumping the build number on the same small branch.

## Schedule

Native app releases usually happen on Sundays.

## Version Cadence

The build number and the marketing version move on different clocks.

**A release moves the build number only.** The marketing version stays where it
is across many builds — build 93 and build 94 are both `1.0.1` — and changes
only when someone decides the release is a `1.0.2` or a `1.1.0`. That decision
is a deliberate edit to `package.json`, not something the release performs.

The marketing version is bumped in `package.json` and nowhere else. The release
propagates it into the Android and iOS projects and then refuses to continue if
the three disagree, so `versionName` and `MARKETING_VERSION` are outputs rather
than places to edit. On the usual release the propagation is a no-op, because
the version it writes is the one already there. See
[[Implementation - Release And Build Workflow]].

Development happens against the next build number.

The release generates the changelog for build `x` and bumps the shared build
number to `x+1` in the same step, **before** the artifacts are built, because
that step is also what creates the tag the artifacts are built from. Merge the
bump back to `develop` before normal development resumes.

This inverts the rule the release used to follow, which was to bump only after
publication. That rule protected a real property - the build number should
identify what is in the stores - and the tag now protects it better: it is
immutable, it points at a tree declaring build `x`, and the helper refuses to
push it otherwise. What actually changes is that `develop` reaches `x+1` a few
hours earlier than it used to, and it was going to spend the rest of the week
there anyway. Decided under issue #1441.

During the following development week:

- Native iOS and Android apps in the stores are build `x`.
- The web app and ongoing development are build `x+1`.
- The next Sunday native release publishes build `x+1`.
- After publishing build `x+1`, bump the shared build number again to `x+2`.

## Branch Convention

The release branch is named after the build being **released**, not the build it
bumps to: releasing build 92 uses `bump-version-92`, and the bump it carries
takes the workspace to 93.

Create it from `origin/develop` at the start of the release, before the web
build. It is the branch the release commit, the tag, and the store artifacts all
belong to.

## Workflow

The tag drives the release. `npm run increment-build-number-and-generate-changelog`
creates `build-<version>-<x>` pointing at the tree that carries build `x`, and
pushing it starts `.github/workflows/native-release.yml`, which builds and signs
both artifacts from exactly that commit. There is no separate dispatch and no
local native build.

1. Confirm the release build.
   - Confirm the build number currently on `develop`; that is the build `x` being
     released.
   - Confirm local state with `git status --short --branch`.
   - Create `bump-version-<x>` from `origin/develop`.

2. Generate the changelog, tag, bump and push.

```bash
npm run increment-build-number-and-generate-changelog
```

The helper performs the whole release step in one go: it generates the changelog
section for build `x`, writes the `package.json` marketing version into both
native projects, increments the shared build number to `x+1`, commits as
`chore: prepare build <version>-<x> release`, creates the annotated tag
`build-<version>-<x>` **pointing at the commit the release branch started from**,
verifies that the tagged tree really declares build `x`, pushes the branch and
the tag, and publishes the GitHub release `Build <x>`.

- If this release changes the marketing version, bump it in `package.json`
  before running the helper. The helper writes it into both native projects and
  fails if `package.json`, Android, and iOS do not agree afterwards.
- The tag is created after the commit, so a failure earlier leaves no tag
  behind, but it names the pre-release commit. If the two ever disagree the
  helper deletes the tag and refuses, rather than pushing a tag that lies about
  what it contains. See issue #1441.
- If the GitHub release step fails - `gh` not authenticated, for example - the
  helper says so explicitly and prints the exact retry command. The commit, tag,
  and push have already succeeded at that point and must not be repeated.

3. Wait for the native build, which also uploads.

   Pushing the tag started it. Watch it with `gh run watch`, or:

```bash
gh run list --workflow=native-release.yml --limit 1
```

Budget about 25 minutes; the iOS archive dominates. The run builds the
production web bundle, asserts it carries no dev-only key and does carry the
App Check gate, syncs both wrappers, produces a signed bundle whose signature
it verifies against the Play upload key, archives and exports iOS, attaches
`build-provenance.json` to the GitHub release, and **uploads both artifacts to
the stores**: the `.ipa` to TestFlight and the `.aab` to Play Open testing as a
draft.

Neither upload reaches a tester. A TestFlight build is invisible until a group
is assigned to it, and a Play draft is invisible until it is submitted. Both of
those are steps 4 and 5 below, and both are deliberate.

Publishing is automatic here because a `build-*` tag is already a deliberate
act - only the release helper makes one, and it refuses a dirty tree, an
existing tag, or a tree that does not declare the build the tag names. If a
store's secret is missing the upload is skipped with a warning rather than
failing the run, so the artifacts survive to be uploaded by hand.

### Inspecting the artifacts

Not required - the run asserts the signature, the build number and the bundle
contents before uploading anything, and nothing is downloaded that could be
corrupted in transit. Worth doing when a release-candidate record needs the
detail:

```bash
gh run download <run id> -n bitetribe-<version>-<build>-<sha>-android -D ~/Desktop/release-<build>
gh run download <run id> -n bitetribe-<version>-<build>-<sha>-ios -D ~/Desktop/release-<build>
```

The second download reports an error extracting `build-provenance.json` because
the first already wrote an identical copy. Everything else extracts; the message
is noise, not a failed download.

4. Write the store build notes.

```bash
npm run release:notes
```

- That prints the changelog range for store notes: everything from the first
  heading up to, but not including, `### Chores`.
- Summarize it into user-facing notes of at most 230 characters, and keep them
  free of platform-specific phrasing: the same English text serves both stores.
- Play needs one block **per listing locale**, not just `en-US`. An unedited
  block is published verbatim. See [[Implementation - Store Release Steps]].
- `npm run release:notes -- --full` prints the wider range that the helper
  already used for the GitHub release body.

5. Complete the store submissions.

- Add the External Testers group with the build notes in App Store Connect and
  submit for beta review. The build must not show **Missing Compliance**; if
  it does, `ITSAppUsesNonExemptEncryption` has been lost from the iOS
  `Info.plist`.
- Add the build notes to the Play Console release, save, and submit the change
  for review.
- Both are detailed in [[Implementation - Store Release Steps]].

6. Merge the release branch.
   - Open a pull request back to `develop` with `gh pr create`, accepting the
     generated `chore: prepare build <version>-<x> release` title.
   - Confirm the PR contains only the changelog section and the build-number
     bump.
   - Squash and merge, then delete the branch.
   - Resume normal development on `develop`, where web and development now use
     build `x+1` while native stores still serve build `x`.

## Building Without CI

The fallback, for a release that cannot use the workflow. It produces the same
artifacts by hand and is the procedure every release used before build 96.

```bash
NX_APP_BITE_TRIBE_APP_CHECK_ENFORCED=true npx nx build bite-tribe --configuration=production --skip-nx-cache
npm run release:verify-bundle
npm run cap:sync:ios
npx nx run bite-tribe-android:sync
npm run release:android
```

- `--skip-nx-cache` is not belt-and-braces. `NX_APP_BITE_TRIBE_APP_CHECK_ENFORCED`
  is not part of the build target's cache key, so the command can return a
  cached bundle carrying the gate disabled. See
  [#1428](https://github.com/muhammedgaygisiz/travellers-apps/issues/1428).
- `npm run release:verify-bundle` fails when either dev-only key is inlined and
  when the App Check gate is not. Prefer it over grepping by hand: the quoting
  the minifier chooses varies, and the double-quoted grep this page used to
  prescribe misses a correct bundle.
- The iOS sync goes through `npm run cap:sync:ios`, not
  `nx run bite-tribe-ios:sync`. The script pins `LANG` and `LC_ALL` to
  `en_US.UTF-8`, without which CocoaPods aborts `pod install` with
  `Unicode Normalization not appropriate for ASCII-8BIT`. An interactive
  terminal already exports a UTF-8 locale, so calling the target directly works
  by hand and fails in agent shells and CI. See [[Architecture - Capacitor]].
- The wrappers bundle `dist/apps/bite-tribe`, so an unsynced wrapper ships the
  previous build's web assets silently.
- Archive and upload iOS from Xcode. `npm run release:android` verifies the
  bundle's signature and refuses to finish on an unsigned or wrong-key bundle.
- Commit or discard any sync output before the helper runs. It refuses a dirty
  working tree.

A hand-built release loses what the workflow provides: the artifacts correspond
to a machine rather than a commit, and nothing writes `build-provenance.json`.
Record the source commit by hand if this path is used.

## Release Output

Each release should produce:

- native apps built in CI from the tagged commit and uploaded to both stores
  with the current release build number
- `build-provenance.json` attached to the GitHub release, naming the source
  commit
- generated changelog section for the released build
- store build notes of at most 230 characters, used for both TestFlight and Play
  Console
- synced native app state
- iOS build uploaded to TestFlight and submitted for external beta review
- Android build uploaded to Google Play Open Testing and submitted for review
- git tag `build-<version>-<build-number>` pushed
- release PR back to `develop` carrying the changelog and the next build-number
  bump
- GitHub release published from the tag

## Checks

- The native release run is green: the bundle check, the signature verification
  and the archive's build-number assertion all pass.
- The tag points at a tree declaring the build it is named after. The helper
  asserts this and refuses to push otherwise, so a release that got this far has
  it.
- Both uploads appear in their store dashboards: a TestFlight build finished
  processing, and a Play draft on Open testing. A skipped upload warns in the
  run rather than failing it, so a green run is not on its own proof that both
  landed.
- Release tag uses the `package.json` version and the build number captured
  before the increment.
- `package.json`, Android `versionName`, and every iOS `MARKETING_VERSION` name
  the same marketing version after the helper runs.
- Pull request back to `develop` contains only the changelog section and the next
  build-number bump.
- Both store submissions are sent for review, not just uploaded.
- GitHub release published from the pushed tag.

## Known Gaps

These are real deviations, recorded so the page does not assert something the
release does not do.

- **The release PR is merged without waiting for CI.** Bump-only PRs are merged
  with the branch-protection bypass so the next development week is not blocked
  behind a full pipeline run. The artifacts were built from the tag and are
  already uploaded by that point, so the pipeline result would not gate them.
- **The bump commit is not what was built.** The tag names the released tree, so
  provenance is intact, but the commit that lands on `develop` carries the
  changelog and the next build number and was never compiled. That is by design
  and is worth stating, because it is the thing the old tagging behaviour got
  backwards.
- **Build notes come from the changelog, not from closed P0 issue titles.** The
  changelog is generated by tooling and the issue list is not, so the changelog
  is the practical source.
- **Closed release issues are not archived** as part of the release.

## Not Yet Practiced

Intended, but not part of the current release:

- Production source maps generated and retained for issue monitoring.
- The artifacts themselves attached to the GitHub release. Only
  `build-provenance.json` is, which is the part that has to outlive the 90-day
  artifact retention; the `.aab` and `.ipa` stay workflow artifacts.
- Nothing here is unpractised any more except the two items above. Publishing
  from CI is wired and automatic on a tag; it becomes practised at the first
  release that uses it.

## Related Pages

- [[Implementation - Store Release Steps]]
- [[Implementation - Release And Build Workflow]]
- [[Architecture - Capacitor]]
- [[Current State - Release State]]
- [[Current State - Release Candidate Test Charter]]
- [[Feature Delivery Workflow]]
