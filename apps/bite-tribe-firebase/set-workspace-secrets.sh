#!/usr/bin/env bash
#
# Sets the Google Workspace email secrets for the BiteTribe functions and
# redeploys the two functions that use them.
#
# Each `secrets:set` command pauses and prompts you to paste the value. The
# values are NOT stored in this file — they go straight into Google Secret
# Manager. Input is hidden while you paste; that is expected.
#
# Run from anywhere:  bash apps/bite-tribe-firebase/set-workspace-secrets.sh

set -euo pipefail

# Directory that holds firebase.json
cd "$(dirname "$0")"

PROJECT="bite-tribe"
FIREBASE="npx --no-install firebase"

echo "==> Setting GOOGLE_WORKSPACE_CLIENT_EMAIL"
echo "    Paste the service account's \"client_email\" (…@…iam.gserviceaccount.com)"
$FIREBASE functions:secrets:set GOOGLE_WORKSPACE_CLIENT_EMAIL --project "$PROJECT"

echo "==> Setting GOOGLE_WORKSPACE_DELEGATED_USER"
echo "    Paste the PRIMARY mailbox address, e.g. muhammed.gaygisiz@bitetribe..."
echo "    Infrastructure only: this is the mailbox that performs the Gmail API"
echo "    delegation and is never shown to a recipient."
$FIREBASE functions:secrets:set GOOGLE_WORKSPACE_DELEGATED_USER --project "$PROJECT"

echo "==> Setting GOOGLE_WORKSPACE_SENDER_ADDRESS"
echo "    Paste the address users see as the sender, e.g. noreply@bitetribe.app"
echo "    Gmail rewrites 'From' to the delegated mailbox unless this address is"
echo "    a verified 'Send mail as' alias of that mailbox, or the mailbox itself."
$FIREBASE functions:secrets:set GOOGLE_WORKSPACE_SENDER_ADDRESS --project "$PROJECT"

echo "==> Setting GOOGLE_WORKSPACE_PRIVATE_KEY"
echo "    Paste the ENTIRE \"private_key\" value from the JSON, including the"
echo "    -----BEGIN PRIVATE KEY----- / -----END PRIVATE KEY----- lines and the \\n sequences."
$FIREBASE functions:secrets:set GOOGLE_WORKSPACE_PRIVATE_KEY --project "$PROJECT"

echo "==> Deploying the functions that use these secrets"
$FIREBASE deploy \
  --only functions:resendEmailVerification,functions:sendEmailVerificationReminders \
  --project "$PROJECT"

echo "==> Done. Trigger 'resend verification' in the app, then check:"
echo "    npx firebase functions:log --only resendEmailVerification --project $PROJECT"
