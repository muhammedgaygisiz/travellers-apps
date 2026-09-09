#!/usr/bin/env bash
#
# Provisions the service account that the `deploy-functions` job in
# .github/workflows/pipeline.yml uses, and stores its key as the GitHub Actions
# secret FIREBASE_SERVICE_ACCOUNT_BITE_TRIBE_FUNCTIONS.
#
# It is a separate account from the hosting one behind
# FIREBASE_SERVICE_ACCOUNT_BITE_TRIBE on purpose. A gen2 functions deploy needs
# Cloud Run, Artifact Registry, Cloud Build, Eventarc, Cloud Scheduler and
# Secret Manager admin; adding that to the credential three jobs already use to
# publish static files would widen what one leaked secret is worth.
#
# The key is written to a private temp file, piped into `gh secret set` and
# removed. It is never echoed and never passed as a command argument.
#
# Requires gcloud authenticated as a project owner, and gh authenticated with
# write access to the repository. On macOS:
#
#   brew install --cask gcloud-cli
#   gcloud auth login
#
# Usage:
#   bash tools/set-functions-deploy-service-account.sh          # create, grant, set the secret
#   bash tools/set-functions-deploy-service-account.sh roles    # re-grant the roles only
#
# See GitHub issue #1464.

set -euo pipefail

PROJECT="${FIREBASE_PROJECT_ID:-bite-tribe}"
ACCOUNT_ID=functions-deploy
ACCOUNT="${ACCOUNT_ID}@${PROJECT}.iam.gserviceaccount.com"
SECRET=FIREBASE_SERVICE_ACCOUNT_BITE_TRIBE_FUNCTIONS

# A gen2 deploy touches far more than Cloud Functions. Each of these is reached
# by some part of the deploy the CLI performs on its own:
#
#   cloudfunctions.admin  the function resources themselves
#   run.admin             gen2 functions are Cloud Run services
#   artifactregistry.admin  the container the build produces is pushed here
#   cloudbuild.builds.editor  the source is built by Cloud Build
#   iam.serviceAccountUser    the deploy acts as the runtime service account
#   secretmanager.admin   binding GOOGLE_WORKSPACE_* and the geocoding key
#   eventarc.admin        every Firestore and Storage trigger
#   cloudscheduler.admin  every onSchedule job
#   pubsub.admin          the topics Eventarc and Scheduler create underneath
#   serviceusage.serviceUsageAdmin  see below
#
# serviceUsageAdmin rather than the read-only serviceUsageConsumer: every deploy
# generates the Pub/Sub and Eventarc service identities, and that call needs
# `serviceusage.services.enable` even when the API is already on. A dry run on
# 9 September 2026 showed it happening on a project where nothing was new.
#
# datastore.viewer is the odd one out and is deliberately read-only: the
# preflight in tools/assert-firestore-indexes-deployed.mjs needs
# `datastore.indexes.list`, and CI must not be able to deploy an index. That
# stays a manual step, sequenced ahead of the functions deploy.
ROLES=(
  roles/cloudfunctions.admin
  roles/run.admin
  roles/artifactregistry.admin
  roles/cloudbuild.builds.editor
  roles/iam.serviceAccountUser
  roles/secretmanager.admin
  roles/eventarc.admin
  roles/cloudscheduler.admin
  roles/pubsub.admin
  roles/serviceusage.serviceUsageAdmin
  roles/datastore.viewer
  roles/firebase.viewer
)

main() {
  require_gcloud
  require_gh

  case "${1:-all}" in
    roles)
      create_account
      grant_roles
      ;;
    all)
      create_account
      grant_roles
      set_secret
      ;;
    *)
      fail "Unknown section '$1'. Use roles, or leave it empty for all."
      ;;
  esac

  echo
  echo "==> Done. The next push to develop deploys the functions."
  echo "    Watch it with: gh run watch"
}

create_account() {
  echo "==> Service account $ACCOUNT"

  if gcloud iam service-accounts describe "$ACCOUNT" --project "$PROJECT" > /dev/null 2>&1; then
    echo "    exists"
    return
  fi

  gcloud iam service-accounts create "$ACCOUNT_ID" \
    --project "$PROJECT" \
    --display-name 'BiteTribe CI functions deploy' \
    --description 'Deploys Cloud Functions from .github/workflows/pipeline.yml. Issue #1464.' \
    > /dev/null

  echo "    created"
}

# `--condition=None` keeps gcloud from prompting for a condition on every
# binding, which would stall the script twelve times.
grant_roles() {
  echo "==> Granting ${#ROLES[@]} roles on $PROJECT"

  for role in "${ROLES[@]}"; do
    gcloud projects add-iam-policy-binding "$PROJECT" \
      --member "serviceAccount:$ACCOUNT" \
      --role "$role" \
      --condition=None \
      > /dev/null
    echo "    $role"
  done

  echo
  echo "    This list is what a gen2 deploy of the current functions needs. If a"
  echo "    deploy still fails on IAM, the error names the missing permission -"
  echo "    add the role that carries it here rather than granting owner."
}

set_secret() {
  echo
  echo "==> Creating a key and storing it as $SECRET"

  local key_file
  key_file="$(mktemp -t functions-deploy-key)"
  # Removed on any exit, including a failure between here and `gh secret set`.
  trap 'rm -f "$key_file"' EXIT

  chmod 600 "$key_file"

  gcloud iam service-accounts keys create "$key_file" \
    --iam-account "$ACCOUNT" \
    --project "$PROJECT" \
    > /dev/null

  gh secret set "$SECRET" < "$key_file" > /dev/null
  rm -f "$key_file"

  echo "    set $SECRET"
  echo
  echo "    The key now exists in two places and one of them is the runner. Old"
  echo "    keys are not rotated by this script; list them with:"
  echo "      gcloud iam service-accounts keys list --iam-account $ACCOUNT --project $PROJECT"
}

require_gcloud() {
  command -v gcloud > /dev/null || fail "The gcloud CLI is not installed."
  gcloud auth print-access-token > /dev/null 2>&1 ||
    fail "gcloud is not authenticated. Run: gcloud auth login"
}

require_gh() {
  command -v gh > /dev/null || fail "The gh CLI is not installed."
  gh auth status > /dev/null 2>&1 || fail "gh is not authenticated. Run: gh auth login"
}

fail() {
  echo "Error: $*" >&2
  exit 1
}

main "$@"
