#!/bin/sh
# Xcode build phase "Select Firebase Backend" (App target, after Resources).
#
# Picks which GoogleService-Info.plist the built app carries. The build
# setting BITETRIBE_FIREBASE_BACKEND chooses it:
#
#   unset / production   App/App/GoogleService-Info.plist   (bite-tribe)
#   qa                   firebase/qa/GoogleService-Info.plist (bite-tribe-qa)
#
#   xcodebuild ... BITETRIBE_FIREBASE_BACKEND=qa build
#
# The plist is copied on every build, the production one included. The
# Resources phase only re-copies a resource whose source changed, so without
# that a production build made after a QA build in the same DerivedData would
# quietly keep the QA plist.
#
# Only the backend varies. The web bundle stays --configuration=production and
# the Swift code stays the same, so a QA run exercises the binary TestFlight
# ships (issue 1221, the constraint carried over from issue 1219).
set -eu

backend="${BITETRIBE_FIREBASE_BACKEND:-production}"

case "$backend" in
  production)
    source_plist="${SRCROOT}/App/GoogleService-Info.plist"
    ;;
  qa)
    # An archive is what gets uploaded to App Store Connect. A QA-backed
    # archive would ship an app that talks to disposable data.
    if [ "${ACTION:-build}" = "install" ]; then
      echo "error: refusing to archive with BITETRIBE_FIREBASE_BACKEND=qa"
      exit 1
    fi
    source_plist="${SRCROOT}/../firebase/qa/GoogleService-Info.plist"
    ;;
  *)
    echo "error: unknown BITETRIBE_FIREBASE_BACKEND '${backend}' (expected production or qa)"
    exit 1
    ;;
esac

target_plist="${TARGET_BUILD_DIR}/${UNLOCALIZED_RESOURCES_FOLDER_PATH}/GoogleService-Info.plist"
cp "$source_plist" "$target_plist"
echo "note: Firebase backend ${backend}: $(/usr/libexec/PlistBuddy -c 'Print :PROJECT_ID' "$target_plist")"
