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

After native apps are built, released, and published for build `x`, generate the
release notes for that completed build and bump the shared build number to
`x+1`. Merge that bump back to `develop` before normal development resumes.

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

1. Confirm the release build.
   - Confirm the build number currently on `develop`; that is the build `x` being
     released.
   - Confirm local state with `git status --short --branch`.
   - Create `bump-version-<x>` from `origin/develop`.
   - Do not increment the build number yet.

2. Build the web application for the release build.

```bash
NX_APP_BITE_TRIBE_APP_CHECK_ENFORCED=true npx nx build bite-tribe --configuration=production
```

- Fix release-blocking build errors before continuing.
- The `NX_APP_BITE_TRIBE_APP_CHECK_ENFORCED` prefix is required. The variable
  defaults to off and the local `.env` sets it to `false`, so a build without
  the prefix silently wraps native artifacts with the enforced-mode gate
  disabled. Decided under
  [issue 1177](https://github.com/muhammedgaygisiz/travellers-apps/issues/1177).
- Confirm the bundle is clean before it is wrapped:

```bash
npm run release:verify-bundle
```

It fails when either dev-only key is inlined, and when the App Check gate is
not. Prefer it over grepping by hand. The check that was documented here
looked for `NX_APP_BITE_TRIBE_APP_CHECK_ENFORCED:"true"`, and the build of
commit `297f8be4` emits that value as the template literal `` `true` ``, so
the "expect a match" half found nothing on a bundle that was entirely
correct. The script accepts every quote form.

What the colon is for still holds, and the script relies on it: the bare key
names appear in every build as runtime lookup constants, so only the property
form proves a **value** was inlined. This check is not optional; see
[[Current State - Release Candidate Test Charter]].

3. Sync native apps.

```bash
npm run cap:sync:ios
npx nx run bite-tribe-android:sync
```

- The iOS sync goes through `npm run cap:sync:ios`, not through
  `nx run bite-tribe-ios:sync` directly. The script exists only to pin `LANG`
  and `LC_ALL` to `en_US.UTF-8`, without which CocoaPods aborts `pod install`
  with `Unicode Normalization not appropriate for ASCII-8BIT`. An interactive
  terminal already exports a UTF-8 locale, so calling the target directly works
  by hand and fails in agent shells and CI. See
  [[Implementation - Store Release Steps]] and [[Architecture - Capacitor]].
- The wrappers bundle `dist/apps/bite-tribe`, so an unsynced wrapper ships the
  previous build's web assets silently.
- Treat generated native changes as sync outputs and review the diffs.
- Commit or discard any sync output before step 6. The release helper refuses
  to run against a dirty working tree.

4. Build and upload the native apps.
   - Archive and upload iOS from Xcode.
   - Produce the signed Android App Bundle with `npm run release:android`, which
     also verifies the bundle is signed with the Play upload key and refuses to
     finish otherwise.
   - `.github/workflows/native-release.yml` is the intended replacement for this
     step. Until a run has produced an installable artifact on each platform, it
     is not the release path — see the ordering note under Known Gaps.
   - Confirm the archived version and build number before distributing.
   - The full console procedure is [[Implementation - Store Release Steps]].

5. Upload to the test tracks.
   - iOS to TestFlight through App Store Connect.
   - Android to Google Play Open Testing.
   - Confirm both uploads are visible in their store dashboards.

6. Generate release notes, bump, tag, and push.
   - Run only after the native artifacts for build `x` are uploaded.

```bash
npm run increment-build-number-and-generate-changelog
```

- If this release changes the marketing version, bump it in `package.json`
  before running the helper. The helper writes it into both native projects and
  fails if `package.json`, Android, and iOS do not agree afterwards.

The helper performs the whole release in one step: it generates the changelog
section for build `x`, writes the `package.json` marketing version into both
native projects, increments the shared build number to `x+1`, commits as
`chore: prepare build <version>-<x> release`, creates the annotated tag
`build-<version>-<x>`, pushes both the branch and the tag, and publishes the
GitHub release `Build <x>` from that tag. No separate `git push` is needed, and
the GitHub release is no longer created by hand.

If the GitHub release step fails — `gh` not authenticated, for example — the
helper says so explicitly and prints the exact retry command. The commit, tag,
and push have already succeeded at that point and must not be repeated.

7. Write the store build notes.

```bash
npm run release:notes
```

- That prints the changelog range for store notes: everything from the first
  heading up to, but not including, `### Chores`.
- Summarize it into user-facing notes of at most 230 characters.
- The same text is used for App Store Connect _What to Test_ and the Play
  Console release notes.
- `npm run release:notes -- --full` prints the wider range that the helper
  already used for the GitHub release body.

8. Complete the store submissions.

- Add the External Testers group with the build notes in App Store Connect and
  submit for beta review. The build must not show **Missing Compliance**; if
  it does, `ITSAppUsesNonExemptEncryption` has been lost from the iOS
  `Info.plist`.
- Add the build notes to the Play Console release, save, and submit the change
  for review.
- Both are detailed in [[Implementation - Store Release Steps]].

9. Merge the release branch.
   - Open a pull request back to `develop` with `gh pr create`, accepting the
     generated `chore: prepare build <version>-<x> release` title.
   - Confirm the PR contains only the changelog section and the build-number
     bump.
   - Squash and merge, then delete the branch.
   - Resume normal development on `develop`, where web and development now use
     build `x+1` while native stores still serve build `x`.

10. Confirm the GitHub release.

- Step 6 already published `Build <x>` from the tag, with the full changelog
  range as its body. Nothing to create by hand.
- Only act here if step 6 reported that the release could not be created, in
  which case run the retry command it printed.

## Release Output

Each release should produce:

- native apps built and uploaded with the current release build number
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

- Production web build succeeds and the bundle passes the debug-token check.
- Both Capacitor syncs complete and their diffs are reviewed.
- iOS archive and Android signed bundle both succeed.
- Native uploads complete before the release helper runs.
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

- **The tag does not point at the released source.** The helper tags the bump
  commit, which already carries build `x+1`. Record the source commit for each
  uploaded artifact separately; the stores do not expose it, and
  [[Current State - Release Candidate Test Charter]] needs it.

  This is also what stands between the CI native jobs and the released
  artifacts. `native-release.yml` fires on the `build-*` tag, but under the
  order below that tag is created in step 6, after step 4 has already uploaded,
  and on a tree carrying `x+1`. A tag-triggered run therefore builds next
  week's build, correctly and traceably, but not the one that shipped. Making CI
  the source of the released artifact means dispatching the workflow on the
  release branch during step 4, while it still carries build `x`, and leaving
  the tag as the record it already is. That decision is open; nothing is broken
  by leaving it open, because the jobs name their artifacts from the tree rather
  than from the tag.

- **The release PR is merged without waiting for CI.** Bump-only PRs are merged
  with the branch-protection bypass so the next development week is not blocked
  behind a full pipeline run. The released artifacts were built locally and are
  already uploaded by that point, so the pipeline result would not gate them.
- **Build notes come from the changelog, not from closed P0 issue titles.** The
  changelog is generated by tooling and the issue list is not, so the changelog
  is the practical source.
- **Closed release issues are not archived** as part of the release.

## Not Yet Practiced

Intended, but not part of the current release:

- Production source maps generated and retained for issue monitoring.
- Native build artifacts and source maps attached to the tag or GitHub release.
- Signed, commit-traceable native artifacts produced in CI. The jobs exist in
  `.github/workflows/native-release.yml`, but no run has happened: the signing
  secrets are not provisioned, so step 4 is still a workstation
  ([issue #1181](https://github.com/muhammedgaygisiz/travellers-apps/issues/1181)).

## Related Pages

- [[Implementation - Store Release Steps]]
- [[Implementation - Release And Build Workflow]]
- [[Architecture - Capacitor]]
- [[Current State - Release State]]
- [[Current State - Release Candidate Test Charter]]
- [[Feature Delivery Workflow]]
