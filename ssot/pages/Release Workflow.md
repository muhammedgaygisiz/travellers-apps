# Release Workflow

## Purpose

This workflow describes the usual Sunday native release path for BiteTribe.

It turns the current build number into native app updates, then opens the next
development cycle by bumping the build number on the same small branch.

## Schedule

Native app releases usually happen on Sundays.

## Version Cadence

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
npx nx build bite-tribe --configuration=production
```

- Fix release-blocking build errors before continuing.
- Confirm the bundle is clean before it is wrapped: grep the emitted
  JavaScript in `dist/apps/bite-tribe` for the App Check debug token value and
  for `IS_DEV`, and expect no match. This check is not optional; see
  [[Current State - Release Candidate Test Charter]].

3. Sync native apps.

```bash
npx nx run bite-tribe-ios:sync
npx nx run bite-tribe-android:sync
```

- The wrappers bundle `dist/apps/bite-tribe`, so an unsynced wrapper ships the
  previous build's web assets silently.
- Treat generated native changes as sync outputs and review the diffs.
- Commit or discard any sync output before step 6. The release helper refuses
  to run against a dirty working tree.

4. Build and upload the native apps.
   - Archive and upload iOS from Xcode, and produce the signed Android App Bundle
     from Android Studio.
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

The helper performs the whole release commit in one step: it generates the
changelog section for build `x`, increments the shared build number to `x+1`,
commits as `chore: prepare build <version>-<x> release`, creates the
annotated tag `build-<version>-<x>`, and pushes both the branch and the tag.
No separate `git push` is needed.

7. Write the store build notes.
   - Source: the generated changelog, from `### Features` up to, but not
     including, `### Chores`.
   - Summarize that range into user-facing notes of at most 230 characters.
   - The same text is used for App Store Connect _What to Test_ and the Play
     Console release notes.

8. Complete the store submissions.
   - Clear the App Store Connect encryption compliance prompt, add the External
     Testers group with the build notes, and submit for beta review.
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

10. Publish the GitHub release.

- Open the repository tags, find `build-<version>-<x>`, and choose
  **Create release** from the row menu.
- Title the release `Build <x>`.
- Body: the generated changelog from `### Features` through the end of
  `### Chores`. This range is wider than the store build notes on purpose.
- **Publish release**.

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
- Release tag uses the native version and the build number captured before the
  increment.
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
- Signed, commit-traceable native artifacts produced in CI
  ([issue #1181](https://github.com/muhammedgaygisiz/travellers-apps/issues/1181)).

## Related Pages

- [[Implementation - Store Release Steps]]
- [[Implementation - Release And Build Workflow]]
- [[Architecture - Capacitor]]
- [[Current State - Release State]]
- [[Current State - Release Candidate Test Charter]]
- [[Feature Delivery Workflow]]
