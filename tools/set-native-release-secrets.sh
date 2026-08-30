#!/usr/bin/env bash
#
# Sets the GitHub Actions secrets that .github/workflows/native-release.yml
# needs.
#
# Values are read from local files or typed at a prompt and piped straight into
# `gh secret set`. Nothing is echoed, nothing is written to disk, and no value
# is passed as a command argument where `ps` could see it. Same shape as
# apps/bite-tribe-firebase/set-workspace-secrets.sh.
#
# Usage:
#   bash tools/set-native-release-secrets.sh android   # derivable from this machine
#   bash tools/set-native-release-secrets.sh ios       # needs a distribution .p12 and an API key
#   bash tools/set-native-release-secrets.sh play      # publishing only
#   bash tools/set-native-release-secrets.sh all

set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

KEYSTORE_PROPERTIES=apps/bite-tribe-android/android/keystore.properties
SECTION="${1:-all}"

main() {
  require_gh

  case "$SECTION" in
    android) set_android ;;
    ios) set_ios ;;
    play) set_play ;;
    all)
      set_android
      set_ios
      set_play
      ;;
    *)
      fail "Unknown section '$SECTION'. Use android, ios, play, or all."
      ;;
  esac

  echo
  echo "==> Done. Current secrets:"
  # GH_PAGER, or gh opens the list in less and the script looks hung at (END).
  GH_PAGER=cat gh secret list
}

# ---------------------------------------------------------------- Android ---
#
# Nothing to type: keystore.properties already holds every value, and the
# release job reads the same four through the environment-variable fallback in
# apps/bite-tribe-android/android/app/build.gradle.
set_android() {
  echo "==> Android upload keystore"

  [ -f "$KEYSTORE_PROPERTIES" ] ||
    fail "$KEYSTORE_PROPERTIES is missing. It is gitignored, so it has to exist on this machine."

  local keystore
  keystore="$(read_property storeFile)"

  [ -n "$keystore" ] || fail "storeFile is not set in $KEYSTORE_PROPERTIES."
  [ -f "$keystore" ] || fail "The keystore does not exist at: $keystore"

  echo "    keystore: $keystore"

  base64 < "$keystore" | tr -d '\n' | put BITETRIBE_KEYSTORE_BASE64
  read_property storePassword | put BITETRIBE_KEYSTORE_PASSWORD
  read_property keyAlias | put BITETRIBE_KEY_ALIAS
  read_property keyPassword | put BITETRIBE_KEY_PASSWORD

  echo "    The job verifies the bundle's signature against the Play upload key,"
  echo "    so a wrong keystore here fails the build rather than reaching Play."
}

# -------------------------------------------------------------------- iOS ---
set_ios() {
  echo
  echo "==> iOS distribution certificate"
  echo "    Keychain Access > My Certificates > right-click the Apple Distribution"
  echo "    certificate > Export > Personal Information Exchange (.p12)."
  echo "    Export the certificate WITH its private key, or CI cannot sign."

  local p12 p12_password
  p12="$(ask_path 'Path to the .p12')"

  read -rsp "    Password you set when exporting the .p12: " p12_password
  echo

  base64 < "$p12" | tr -d '\n' | put IOS_DIST_CERTIFICATE_P12_BASE64
  printf '%s' "$p12_password" | put IOS_DIST_CERTIFICATE_PASSWORD
  unset p12_password

  echo
  echo "==> App Store Connect API key"
  echo "    App Store Connect > Users and Access > Integrations > App Store Connect API."
  echo "    The key needs App Manager or Admin: xcodebuild uses it to fetch the"
  echo "    provisioning profile, which a Developer-role key may not do."
  echo "    The .p8 downloads exactly once."

  local key_id issuer_id p8
  read -rp "    Key ID (the KEYID in AuthKey_KEYID.p8): " key_id
  read -rp "    Issuer ID (a UUID, shown above the key list): " issuer_id
  p8="$(ask_path 'Path to the AuthKey_*.p8')"

  printf '%s' "$key_id" | put APP_STORE_CONNECT_KEY_ID
  printf '%s' "$issuer_id" | put APP_STORE_CONNECT_ISSUER_ID
  base64 < "$p8" | tr -d '\n' | put APP_STORE_CONNECT_PRIVATE_KEY_BASE64
}

# ------------------------------------------------------------------- Play ---
#
# Only needed to publish. The default run stops at a retained artifact, so this
# can stay unset until a store upload is actually wanted.
set_play() {
  echo
  echo "==> Google Play service account (publishing only)"
  echo "    Play Console > Users and permissions > invite the service account,"
  echo "    then Google Cloud > IAM > Service Accounts > Keys > Add key (JSON)."
  echo "    Leave the path empty to skip."

  local json
  read -rp "    Path to the service account JSON (empty to skip): " json
  json="${json/#\~/$HOME}"

  if [ -z "$json" ]; then
    echo "    Skipped."
    return
  fi

  [ -f "$json" ] || fail "No file at: $json"

  put PLAY_SERVICE_ACCOUNT_JSON < "$json"
}

# ------------------------------------------------------------------ utils ---

# Reads a value from the Java properties file. Everything after the first `=`
# is the value, so a password containing `=` survives.
#
# The newlines are stripped, not trimmed as a courtesy. A properties value runs
# to the end of its line, so there is never one inside a value, and sed adds one
# on the way out. Leaving it there would set an alias of "First Key\n" and fail
# signing with the same misleading `No key with alias` that quoting the value
# causes - see ssot/pages/Implementation - Store Release Steps.md.
read_property() {
  sed -n "s/^$1=//p" "$KEYSTORE_PROPERTIES" | tr -d '\r\n'
}

# Pipes stdin into `gh secret set`, so the value never appears in the process
# list or the terminal.
put() {
  gh secret set "$1" > /dev/null
  echo "    set $1"
}

ask_path() {
  local path
  read -rp "    $1: " path
  path="${path/#\~/$HOME}"

  [ -n "$path" ] || fail "A path is required."
  [ -f "$path" ] || fail "No file at: $path"

  printf '%s' "$path"
}

require_gh() {
  command -v gh > /dev/null || fail "The gh CLI is not installed."
  gh auth status > /dev/null 2>&1 || fail "gh is not authenticated. Run: gh auth login"
}

fail() {
  echo "Error: $*" >&2
  exit 1
}

main
