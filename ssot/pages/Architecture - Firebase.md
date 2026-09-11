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
bites               bites/{id}/likes
users               users/{id}/followers, users/{id}/following, users/{id}/pushTokens
restaurants         restaurants/{id}/rooms, restaurants/{id}/tables
restaurantStaff
tableTokens
menus
bucketlists
biteTrails          biteTrails/{id}/sells, biteTrails/{id}/ratings
reviews
settings
restaurantCandidates
displayNames
meta
accountDeletions
pushTokens
```

Every one of these is named in `firestore.rules`, and anything not named there
is denied. Adding a collection to the product means adding it to the rules.

## Firestore Security Rules

Until issue \#1078 the whole database was one match on `/{document=**}` allowing
read and write to any signed-in account. `apps/bite-tribe-firebase/firestore.rules`
now scopes every write by ownership. Three rules of thumb carry the file:

- **Reads are where they were.** Every collection a signed-in account could read
  before, it can still read. Issue \#1079 narrowed what the business app _sees_
  in the client query rather than here, so an unowned restaurant is still
  readable and simply not listed. The two exceptions are `accountDeletions` and
  the top-level `pushTokens` index, which are cross-account identifiers no
  client ever read.
- **A write is allowed by ownership, not by a role.** The document names the
  account that may write it: `Restaurant.ownerUserId`, `Bite.userId`,
  `Review.authorId`, `Bucketlist.userId`, `BiteTrail.ownerId`, or the document
  id itself for the per-account documents (`settings/{uid}`, a reaction, a
  rating, a follow relationship, a push installation).
- **Backend-owned fields are named.** A field the Admin SDK owns can sit on a
  document the client may otherwise write, so the rule names the field.
  `ownerUserId`, `claimStatus`, `claimedAt` and `claimedAtTimestamp` on a
  restaurant are **writable by no client at all**, including the account that
  owns it, because they are written by `assignRestaurantOwner` and
  `revokeRestaurantOwner` — which bypass rules entirely, so denying every client
  write to them costs the backend nothing and closes the forgery path recorded
  on [[Current State - Known Issues]]. The same holds for the entitlement and
  counter fields on `/users`: `subscriptionTier`, `biteCount`, the follow
  counts, `normalizedDisplayName`, `countryCodes`, the last-seen stamps and the
  email-verification state. The comparison is by value, so a client that reads a
  profile and writes the same numbers back is unaffected.

The one role in the file is `admin`, and it appears as an explicit clause rather
than as an implied `business`. That is `RD-UR-6` in [[User Roles]]: the Operator
is above the Restaurant Owner in capability and not in claims. It is what lets
the admin app create a restaurant and run the Bite migrations while the business
app stays owner-scoped.

**Menus are authorised through their restaurant.** A menu document holds
categories and timestamps and nothing that says who may write it — the only link
is `Restaurant.menuId`, pointing the other way — and rules cannot query. So the
client names the restaurant on every menu write and the rule reads that
restaurant, requiring both that the caller owns it and that its `menuId` is this
menu. Reading the restaurant rather than a field on the menu is what makes this
work with no backfill: a menu written before the field existed is still writable
by its owner and gains the field on its next save.

**`staff` still grants no write here.** The rules scope a write by
`Restaurant.ownerUserId`, and a staff account never holds it. Issue \#1537 wrote
the record that was missing — `/restaurantStaff/{uid}`, one document per staff
account naming its restaurant — and deliberately did not make the rules read it:
what a staff account may write is \#1078's scope and \#1079's, and widening it
from inside a grant surface would have been two changes in one. The role still
opens the business app and reads.

**`/restaurantStaff` is the one collection with narrow reads.** Reads stayed
where they were everywhere else because narrowing them is a regression risk with
no new information; this collection is new, so it starts closed. It holds who
works where, which is a fact about a person rather than about a restaurant, and
that is why it is not a `staffUserIds` array on the world-readable restaurant
document. Three readers — the account itself, the operator, and the account
holding the restaurant — and **no writer at all**: the association only means
anything alongside the `staff` custom claim, which no client can write, so a
client that could write the document could only ever produce half of a grant.
`addRestaurantStaff` and `removeRestaurantStaff` write it through the Admin SDK.

**`/tableTokens` is the one collection a client with no session may read.** It
has to be: a guest scanning the QR code on a table has no account, and the scan
is what establishes which restaurant they would be signing in to. The document
is top-level and named by the token itself, so resolving one is a single
`get` - nesting it under the restaurant would require the scanner to already
know the fact the scan exists to establish.

The rule is `get` without `list`, and that distinction is the whole enumeration
defence (issue \#1086). Whoever physically holds a printed code can read what it
resolves to; nobody can walk the set, so a restaurant's table count and its live
codes stay unavailable to an account that was never given one. Guessing is the
other half and is answered by the token rather than by the rule: 130 bits drawn
from the system CSPRNG, rendered in Crockford base32.

**Nothing client-writable, including the restaurant that owns the table**, and
`RestaurantTable.qrTokenId` is backend-owned on the table document for the same
reason. An owner able to write either could point a table at another
restaurant's token or revive a revoked one, and both are a printed code
resolving somewhere it should not. `issueTableQrTokens`, `rotateTableQrToken`
and `syncTableQrTokenOnTableWrite` write both fields through the Admin SDK. The
`qrTokenId` comparison is by value, so the editor saving a table back whole is
unaffected.

### Testing And Deploying The Rules

`apps/bite-tribe-firebase/functions/src/firestore-rules/__specs__/firestore-rules.emulator-spec.ts`
runs the real rules file against the Firestore emulator through
`@firebase/rules-unit-testing`, with an allow case and a deny case for every
protected collection. A rules file is only half tested by proving it refuses
things: a rule that refuses everything passes every deny test and breaks the
product.

```bash
npx nx firebase-test-rules bite-tribe-firebase
```

The `firestore-rules` job in `.github/workflows/pipeline.yml` runs it on every
pull request. The two e2e suites exercise the rules along the paths they walk,
but neither can assert that something is _refused_.

**The rules deploy by hand, and nothing in CI deploys them.** That is
deliberate, and it is the rollout step issue \#1078 asks for: merge, then run
the suite, then deploy, then watch production for newly denied legitimate paths.

```bash
npx nx firebase-deploy-rules bite-tribe-firebase
```

Rolling back is deploying the previous version of the file, which takes about a
minute. `storage.rules` is still open and is issue \#1350, filed separately.

## Functions Pattern

- Frontend-requested backend work uses callable functions.
- Firestore and Storage side effects use triggers.
- Function exports live in `apps/bite-tribe-firebase/functions/src/index.ts`.
- Backend functions live under `apps/bite-tribe-firebase/functions/src/functions`.
- Callable functions should validate `request.auth` before user-scoped reads.
- Firestore index configuration is code. `apps/bite-tribe-firebase/firestore.indexes.json` holds the composite indexes and the single-field exemptions that collection-group queries need, and deploys on its own through the `bite-tribe-firebase:firebase-deploy-indexes` Nx target (`npm run deploy:indexes`), separately from functions and rules. That one deploy stays manual while functions deploy from CI, because the Firestore API builds an index in the background and the CLI returns before it is usable. The pipeline's `deploy-functions` job asserts the declared indexes are already live instead of deploying them. See [[Implementation - Firebase Functions]].

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

### Seeded Accounts

`nx firebase-serve bite-tribe-firebase` imports `apps/bite-tribe-firebase/.firebase-export`. Its auth export seeds four accounts, all with the password `Test4711`:

| Email                   | Roles      | What it is for                                                   |
| ----------------------- | ---------- | ---------------------------------------------------------------- |
| `admin@test.com`        | `admin`    | Signing into the admin app locally.                              |
| `organisation@test.com` | `business` | The business app, and the account the business E2E suite drives. |
| `test@test.com`         | none       | The consumer app, and the E2E deny case for both role gates.     |
| `test2@test.com`        | none       | A second consumer account.                                       |

**Roles live in the export, in each account's `customAttributes`.** Since issue \#1469 the two privileged apps require a role _at sign-in_, so an account without one cannot log in at all — and the refusal is the same generic error a wrong password gives, by design. An account whose claim is missing from the export therefore presents as "the password is wrong", which is the confusing failure to expect after regenerating it.

`admin` and `business` are held by different accounts on purpose. A single fixture carrying both would hide a bug where one role is treated as implying the other.

**The emulator does not write roles back.** `firebase-serve` runs without `--export-on-exit`, so a claim granted against the running emulator through the Identity Toolkit REST API lasts only for that session. A durable fixture has to be added to the export file itself.

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
