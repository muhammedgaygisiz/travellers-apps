# Release Workflow

## Purpose

This workflow describes the usual Sunday native release path for BiteTribe.

It turns the current build number into native app updates, then opens the next development cycle by bumping the build number on a small branch.

## Schedule

Native app releases usually happen on Sundays.

## Version Cadence

Development happens against the next build number.

After native apps are built, released, and published for build `x`, generate the release notes for that completed build. Then create a small branch that only bumps the build number to `x+1`. Merge that bump back to `develop` before normal development resumes.

During the following development week:

- Native iOS and Android apps in the stores are build `x`.
- The web app and ongoing development are build `x+1`.
- The next Sunday native release publishes build `x+1`.
- After publishing build `x+1`, bump the shared build number again to `x+2`.

## Workflow

1. Confirm the release build.
   - Start from the current intended release base on `develop`.
   - Confirm the build number that will be published to native stores.
   - Confirm local state with `git status --short --branch`.
   - Do not increment the build number before native apps for the current build are published.

2. Identify store build notes.
   - Identify the closed Priority P0 issues implemented during the release week.
   - Use the issue titles to write a short build-notes summary for TestFlight and Google Play Console.
   - Do not archive closed issues yet; keep them available until release notes are generated after native publish.

3. Build the web application for the release build.
   - Run the application build for the current build number.
   - Fix release-blocking build errors before continuing.

```bash
npm run build
```

4. Sync native apps.
   - Run the Capacitor sync workflow for iOS and Android.
   - Treat generated native changes as sync outputs.
   - Review generated native diffs before committing.

5. Prepare production monitoring artifacts.
   - Generate source maps for the production build when supported by the build configuration.
   - Keep source maps available for future production issue monitoring.
   - Do not expose source maps publicly unless the monitoring setup explicitly requires it.

6. Future release tagging.
   - Create a git tag for the release build.
   - Publish the release on GitHub.
   - Attach native build artifacts to the tag or GitHub release when the artifact packaging convention is finalized.
   - Include the matching source maps in the release package or monitoring upload path.
   - This is a future required step and should become part of the release checklist once the tag/release convention is finalized.

7. Build native apps.
   - Build the iOS app for the current build number.
   - Build the Android app for the current build number.
   - Verify both native builds before distribution.
   - Keep the native build outputs traceable to the released build number and future tag.

8. Deploy test builds.
   - Deploy iOS to TestFlight.
   - Deploy Android to Google Play Open Testing.
   - Use the short weekly P0 issue summary as the external build notes.
   - Confirm the uploaded builds are visible in the relevant store/testing dashboards.

9. Generate release notes.
   - Generate release notes after the native apps for build `x` are uploaded.
   - Generate release notes before creating the next-build branch or incrementing the build number to `x+1`.
   - Archive the closed issues after the release notes and store build notes are captured.
   - Use the existing changelog script where possible:

```bash
npm run generate-changelog
```

10. Create the next-build branch.

- Create a branch from the released state only after the native uploads and release notes are complete.
- The branch should only bump the shared build number for the next development cycle.
- Do not include unrelated development work in this branch.

11. Bump the build number.

- Increment the shared build number from the released build `x` to the next build `x+1`.
- Use the existing build-number script:

```bash
npm run increment-build-number
```

12. Merge the next-build branch.

- Create a pull request back to `develop`.
- Confirm the PR contains only the build-number bump.
- Merge the PR after checks pass and the next build number is reviewed.
- Resume normal development on `develop`, where web and development now use build `x+1` while native stores still serve build `x`.

## Release Output

Each release should produce:

- native apps built and uploaded with the current release build number
- generated release notes
- short TestFlight and Google Play build notes from closed weekly P0 issue titles
- updated changelog
- archived closed release issues
- synced native app state
- production source maps retained for issue monitoring
- iOS build uploaded to TestFlight
- Android build uploaded to Google Play Open Testing
- next-build PR back to `develop` that only increments the shared build number
- future: git tag and GitHub release with packaged native artifacts and source maps

## Checks

- Build succeeds.
- Native sync completes.
- iOS native build succeeds.
- Android native build succeeds.
- Release notes and changelog reflect the release.
- TestFlight and Google Play build notes summarize the closed Priority P0 work from the release week.
- Closed release issues are archived after the notes are generated.
- Source maps are generated or the missing source-map path is explicitly documented.
- Native uploads complete before release notes are generated.
- Release notes are generated before the next build number is incremented.
- Pull request back to `develop` contains only the next build-number bump.

## Related Pages

- [[Implementation - Release And Build Workflow]]
- [[Architecture - Capacitor]]
- [[Current State - Release State]]
- [[Feature Delivery Workflow]]
