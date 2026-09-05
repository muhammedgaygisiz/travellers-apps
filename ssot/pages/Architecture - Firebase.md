# Architecture - Firebase

## Purpose

Firebase provides backend persistence, authentication integration, storage, functions, emulators, App Check, and analytics support for BiteTribe.

## Main Firebase Surfaces

- Firestore stores product data.
- Firebase Storage stores user, Bite, Restaurant, and BiteTrail images.
- Firebase Authentication provides user identity through Capacitor Firebase Authentication.
- Firebase Functions own backend callables, triggers, scheduled jobs, and storage finalization logic.
- Firebase emulators support local auth, Firestore, storage, functions, and pubsub development.
- App Check protects backend access where configured.
- Firebase Analytics and Crashlytics support telemetry and exception reporting.

## Firestore Collections

```text
bites
users
restaurants
menus
bucketlists
biteTrails
reviews
settings
```

## Functions Pattern

- Frontend-requested backend work uses callable functions.
- Firestore and Storage side effects use triggers.
- Function exports live in `apps/bite-tribe-firebase/functions/src/index.ts`.
- Backend functions live under `apps/bite-tribe-firebase/functions/src/functions`.
- Callable functions should validate `request.auth` before user-scoped reads.
- Firestore index configuration is code. `apps/bite-tribe-firebase/firestore.indexes.json` holds the composite indexes and the single-field exemptions that collection-group queries need, and deploys on its own through the `bite-tribe-firebase:firebase-deploy-indexes` Nx target (`npm run deploy:indexes`), separately from functions and rules.

## Current Function Examples

```text
loadBitesByLocation
searchUsers
searchBites
searchRestaurants
updateLastSeen
updateUserMetadata
loadLeaderboard
incrementBiteCountOnBiteCreate
decrementBiteCountOnBiteDelete
incrementBiteLikeCountOnLikeCreate
decrementBiteLikeCountOnLikeDelete
updateBiteLikeCountOnLikeUpdate
setBiteImagePathOnUpload
notifyFollowersOnNewBite
notifyBiteCreatorOnLike
notifyBiteCreatorOnReview
notifyUserOnNewFollower
sendWeeklyBiteNotification
handleSharedLinkToBite
createUserOnAuthCreate
deleteOwnAccount
```

## Google Maps Platform Trust Boundary

Google Maps Platform is reached only from the backend. The apps call the `searchPlaces`, `searchNearbyPlaces`, `getPlaceDetails`, `searchBitesByCity`, `getCurrencyByPosition`, and `backfillBiteAddress` callables, and the functions call `places.googleapis.com` and `maps.googleapis.com` server-to-server with the backend-only `GOOGLE_GEOCODING_API_KEY`. No app, library, or native project links a Maps or Places SDK.

Google Maps Platform App Check only accepts tokens minted by the client Maps and Places SDKs, so a server-to-server REST call has no App Check token to attach. Places API (New) therefore reports 0% verified in App Check monitoring by design, and enforcement must stay off for it - enabling it would reject every legitimate BiteTribe place search.

The equivalent verified control is the callable in front of the API: App Check enforced through `onAppCheck`, plus an authenticated caller. `apps/bite-tribe-firebase/functions/src/__specs__/google-maps-request-path.spec.ts` fails the build when a client reaches a Google Maps host, when a native Maps or Places SDK is linked, or when a callable is registered without App Check enforcement. See [[issue-1245]].

## Adding A Web App To The Project

Creating a Firebase Hosting site does **not** authorise the new domain anywhere else. Three separate allowlists have to be edited by hand, in three different consoles, and none of them is mentioned when the site is created. Verified on 5 September 2026 while bringing up `bite-tribe-admin` (issue \#1469).

| Allowlist                        | Where                                                                                 | Format                                    | Symptom when missing                                                                                                                                  |
| -------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| API key HTTP referrers           | Cloud Console, APIs & Services, Credentials, "Browser key (auto created by Firebase)" | `https://<domain>/` with a trailing slash | Every Identity Toolkit call returns 403 `API_KEY_HTTP_REFERRER_BLOCKED`. Sign-in does nothing at all: no popup, no network request, no visible error. |
| Firebase Auth authorized domains | Firebase Console, Authentication, Settings                                            | bare domain, no scheme                    | `auth/unauthorized-domain`                                                                                                                            |
| reCAPTCHA Enterprise domain list | Cloud Console, Security, reCAPTCHA, the App Check site key                            | bare domain, no scheme                    | `appCheck/recaptcha-error`                                                                                                                            |

Add both `<site>.web.app` and `<site>.firebaseapp.com` to each. Add the dev-server port to the API key list too — it carries `http://localhost:4200/` only, so a second app on another port is blocked locally even though the first one works.

The first of the three is the one that presents worst. A blocked referrer produces **silence**, not an error: `LoginService.loginWithGoogleAccount()` dispatches into the store, the effect's sign-in throws, and the login page shows nothing. "Nothing happens when I click sign in" on a newly deployed app means this list before it means anything else.

### Verifying Without The Console

The project config endpoint is publicly readable with the web API key, so both of the first two lists can be checked from a terminal rather than clicked through:

```bash
curl -s -H "Referer: https://<domain>/" \
  "https://identitytoolkit.googleapis.com/v1/projects?key=$API_KEY"
```

A 403 answers the referrer question; the `authorizedDomains` array in a 200 answers the second. There is no equivalent read for the reCAPTCHA list.

### An Automated Browser Cannot Verify This

A headless or automated browser fails the OAuth popup and App Check the same way a genuinely misconfigured domain does, so it reports a fixed app as still broken. Confirmed by A/B against the working `bite-tribe-business` app, which produced identical symptoms in the same browser. **Sign-in has to be confirmed in a real browser**; the curl probes above are the part that can be automated.

## Local Development

Firebase emulator targets are defined under `apps/bite-tribe-firebase/project.json`.

The app environment exposes emulator ports for Firestore, Functions, Auth, and Storage.

## Code Anchors

```text
apps/bite-tribe-firebase/firebase.json
apps/bite-tribe-firebase/firestore.rules
apps/bite-tribe-firebase/firestore.indexes.json
apps/bite-tribe-firebase/storage.rules
apps/bite-tribe-firebase/functions/src/index.ts
apps/bite-tribe-firebase/functions/src/functions
libs/common/ta-firestore
libs/bite-tribe/api
```

## Current Limitations

- Some backend responsibilities are still split between frontend Firebase access and backend callables.
- App Check health depends on runtime configuration and platform attestation.
- App Check cannot cover Google Maps Platform from a backend request path, so Places API (New) stays in Monitoring behind the callable boundary described above.
- Some aggregate and migration behaviors need operational care because Firestore query semantics can skip documents with missing fields.
