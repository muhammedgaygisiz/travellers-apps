# Release Workflow

## Purpose

This workflow describes the usual Sunday release path for BiteTribe.

It turns completed development work into build artifacts, native app updates, release notes, and a pull request back to `develop`.

## Schedule

Releases usually happen on Sundays.

## Workflow

1. Create a release branch.
   - Start from the intended release base.
   - Create a dedicated release branch.
   - Confirm local state with `git status --short --branch`.

2. Prepare release metadata.
   - Increment the build number.
   - Generate release notes.
   - Identify the closed Priority P0 issues implemented during the release week.
   - Use the issue titles to write a short build-notes summary for TestFlight and Google Play Console.
   - Archive the closed issues after the release notes and store build notes are captured.
   - Use existing scripts where possible:

```bash
npm run increment-build-number
npm run generate-changelog
```

or:

```bash
npm run increment-build-number-and-generate-changelog
```

3. Build the application.
   - Run the application build.
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
   - Create a git tag for the release.
   - Publish the release on GitHub.
   - Attach native build artifacts to the tag or GitHub release when the artifact packaging convention is finalized.
   - Include the matching source maps in the release package or monitoring upload path.
   - This is a future required step and should become part of the release checklist once the tag/release convention is finalized.

7. Build native apps.
   - Build the iOS app.
   - Build the Android app.
   - Verify both native builds before distribution.
   - Keep the native build outputs traceable to the release branch, build number, and future tag.

8. Deploy test builds.
   - Deploy iOS to TestFlight.
   - Deploy Android to Google Play Open Testing.
   - Use the short weekly P0 issue summary as the external build notes.
   - Confirm the uploaded builds are visible in the relevant store/testing dashboards.

9. Merge release metadata back.
   - Create a pull request back to `develop`.
   - Include the generated changelog and incremented build number.
   - Merge the PR after checks pass and release metadata is reviewed.

## Release Output

Each release should produce:

- incremented build number
- generated release notes
- short TestFlight and Google Play build notes from closed weekly P0 issue titles
- updated changelog
- archived closed release issues
- synced native app state
- production source maps retained for issue monitoring
- iOS build uploaded to TestFlight
- Android build uploaded to Google Play Open Testing
- PR back to `develop` with release metadata
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
- Pull request back to `develop` contains only release metadata and generated release outputs.

## Related Pages

- [[Implementation - Release And Build Workflow]]
- [[Architecture - Capacitor]]
- [[Current State - Release State]]
- [[Feature Delivery Workflow]]
