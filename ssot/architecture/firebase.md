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
restaurants         restaurants/{id}/rooms, restaurants/{id}/tables,
                    restaurants/{id}/tableStates,
                    restaurants/{id}/tableStateTransitions,
                    restaurants/{id}/visits,
                    restaurants/{id}/tableSessions,
                    restaurants/{id}/visits/{id}/orders,
                    restaurants/{id}/assistanceRequests,
                    restaurants/{id}/scanAnomalies
restaurantStaff
tableTokens
scanRateLimits
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

Until issue [#1078] the whole database was one match on `/{document=**}` allowing
read and write to any signed-in account. `apps/bite-tribe-firebase/firestore.rules`
now scopes every write by ownership. Three rules of thumb carry the file:

- **Reads are where they were.** Every collection a signed-in account could read
  before, it can still read. Issue [#1079] narrowed what the business app _sees_
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
  on [Current State - Known Issues](../current-state/known-issues.md). The same holds for the entitlement and
  counter fields on `/users`: `subscriptionTier`, `biteCount`, the follow
  counts, `normalizedDisplayName`, `countryCodes`, the last-seen stamps and the
  email-verification state. The comparison is by value, so a client that reads a
  profile and writes the same numbers back is unaffected.

The one role in the file is `admin`, and it appears as an explicit clause rather
than as an implied `business`. That is `RD-UR-6` in [User Roles](../product/user-roles.md): the Operator
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

**`staff` still grants no write here, and now has one anyway.** The rules scope
a write by `Restaurant.ownerUserId`, and a staff account never holds it. Issue
[#1537] wrote the record that was missing — `/restaurantStaff/{uid}`, one document
per staff account naming its restaurant — and deliberately did not make the
rules read it. Issue [#1092] gave the role its first write, and deliberately did
not put it here either: a host changes a table's live state through
`transitionTableState`, a callable, because the outcome of two hosts acting at
once has to be decided by one transaction rather than by the later write
landing. The rules do now read the association, for **reads**: `worksAt()` pairs
the `staff` claim with the association naming that one restaurant, which is what
lets a staff account see a published plan and its live state and nothing else.
The pair is deliberate - the claim alone says "some restaurant employs this
account", and the association alone is a document that outlived its grant.

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

**Live table state is read like the plan and written by nobody** (issue
[#1092]). `/restaurants/{id}/tableStates/{tableId}` is what each table is doing
right now and
`/restaurants/{id}/tableStateTransitions/{transitionId}` is how it got there,
and both admit exactly the readers of the published plan: the staff of that
restaurant, the account holding it, and the operator. A table's live state is
worth no more protection than the table and no less, and two lists of readers
for one room would drift.

Every client write to both is refused, which is not a tidy default but the
mechanism. Two hosts tapping "seat" on table 12 in the same second is the case
the feature exists for: with client writes the later one lands and the
restaurant has one table and two parties, with no record that it happened.
`transitionTableState` applies the change in a transaction against the state the
caller says it saw, so one of the two commits and the other is told what the
table holds now. A client write would be the way round that, so there is not one

- not for the host, not for the owner, not for the operator. The audit trail is
  append-only for the same reason it exists: a disputed table is answered by a
  history nobody could have edited afterwards.

The audit entry is also the **dedupe record** (issue [#1096]). A caller may name
its transition with a `requestId`, which becomes that entry's document id
prefixed `req-`; the callable reads the document it would write inside the same
transaction, so a request sent twice - the ordinary shape of an offline queue
draining - is applied once and answered twice with what the first attempt
recorded. It needed no second collection and no lock: the record of what
happened was already there, and naming it after the intent is what makes it
findable.

**A table visit is stored beside the state and written by nobody either**
(issue [#1095]). `/restaurants/{id}/visits/{visitId}` is the party at a table
over time, and it admits the same readers as the plan and the live state.

It is under the restaurant rather than under the table, and that placement is
the requirement rather than a preference: deleting a table from the floor plan
takes its subcollections with it, and the record of what happened at that table
in November is the one thing that must not go. `tableId` is therefore a plain
string that keeps naming a table nobody can find any more.

Client writes are refused for a sharper reason than for the state. A client able
to write here could open a second visit at a table that already has one, and the
orders of issue [#1072] and the bill of issue [#1073] hang from the visit - a
party billed for the next party's dinner is what that hole looks like from the
dining room. `transitionTableState` opens and ends visits alongside the state
change that caused them, in one transaction, and `moveTableVisit` walks an open
visit to another table without ending it.

**A guest's table session is the one collection a signed-in stranger reads a
single document of and nothing more** (issue [#1101]). A session lives at
`/restaurants/{restaurantId}/tableSessions/{sessionId}`, its name derived from
the table and the guest's uid, and the guest clause matches
`resource.data.guestUserId` against `request.auth.uid`. So the phone that
started a session derives the name and subscribes to it directly, which is the
whole reason a guest signs in anonymously rather than being handed an opaque
secret to replay - without a uid, every read of their own session would need a
callable.

`get` without `list`, for the same reason the tokens are: one query would hand a
guest everybody at their table, and the next one every table in the restaurant.
Staff reach the collection through `readsFloorPlan`, the same list as the
tables, their live state and the visits - a pending session is a signal to the
people on the floor and is worth exactly what the table it names is worth.

**Written by nobody.** A client able to write here could set its own status to
`active` and name any visit it liked, which is precisely what the pending signal
exists to prevent: somebody who never left their sofa ordering at a table in a
restaurant. `startTableSession`, `leaveTableSession` and `transitionTableState`
write it through the Admin SDK. The clause a rule checking ownership alone would
miss is the guest promoting their _own_ `pending` session to `active` - they do
own that document, and activating it is exactly the confirmation staff are meant
to give.

**`/tableTokens` is the one collection a client with no session may read.** It
has to be: a guest scanning the QR code on a table has no account, and the scan
is what establishes which restaurant they would be signing in to. The document
is top-level and named by the token itself, so resolving one is a single
`get` - nesting it under the restaurant would require the scanner to already
know the fact the scan exists to establish.

The rule is `get` without `list`, and that distinction is the whole enumeration
defence (issue [#1086]). Whoever physically holds a printed code can read what it
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

**The public `get` is not the resolution, and was never meant to be.** It gives a
phone a restaurant id, a room id and a table label. Whether the restaurant is
still held by anyone, whether it takes orders at the table, whether the table is
still in the published plan, whether the kitchen is open and whether there is a
menu all live in documents a guest may not read, and three of them change without
the token being touched. `resolveTableQrToken` (issue [#1100]) is the callable
that answers, and it is the one `public` endpoint that reads restaurant data: a
guest at a table has no account, so requiring one would make the account a
precondition of finding out whether the restaurant even takes orders. App Check
is enforced on it like every other endpoint, it writes nothing, and it assembles
its answer field by field rather than handing back the documents it read.

`startTableSession` (issue [#1101]) runs the same checks again before it
writes, through the same `resolveScan` rather than a copy of it. That is not
belt and braces: the client holds the earlier resolution for as long as the
guest takes to read the confirmation screen, and three of the checks move inside
a service - the kitchen pauses, the clock passes closing time, the owner turns
the feature off. It requires a session where the scan does not, and an anonymous
one is enough; what the door opens onto is one document named after the caller's
own uid. See [Implementation - Firebase Functions](../implementation/firebase-functions.md).

**Two collections exist because the codes are assumed to leak** (issue [#1107]).

`/restaurants/{id}/scanAnomalies/{n}_{tableId}_{kind}` is what the restaurant is
told about scans that do not look ordinary - a token past its limit, a code
scanned while the restaurant is shut or at a table out of service, more live
sessions than a table can seat, a consented position far away. Nobody writes it
from a client and **no guest reads it**, which is where it differs from the
assistance requests it otherwise copies: an assistance request is something a
guest raised and is owed the answer to, and an anomaly is something said _about_
their scan - handing them a way to find out whether they tripped one would hand
an attacker the feedback loop for tuning around it. Staff read it through
`readsFloorPlan`, the same list as everything else about one dining room.

The address is issue [#1106]'s, and the reason is worth stating on this page
because it is a rule about shape rather than about this feature. A log of scan
attempts is the obvious way to report an attack and it is the wrong one: reading
the screen then costs more the harder somebody tries. Naming the document after
the table and the kind bounds the collection at the size of the room forever, so
the staff screen reads the whole of it with no `where`, no composite index and
no collection-group rule - and a restaurant under sustained attack holds exactly
as many documents as one that is not.

`/scanRateLimits/{dimension}_{bucket}_{windowStartedAt}` is the durable half of
the scan limit, and is the one collection in the rules file that **no role reads
and no role writes**, the operator included. A readable counter is a readable
answer to "how much of my allowance is left", which turns a limit that has to be
discovered by tripping it - and tripping it raises a row a restaurant sees - into
one that can be run right up to and never crossed. The `ip` dimension also names
a bucket derived from an address; it is a truncated hash rather than the address
and every document is dead inside two minutes, but a guest's network is not
something a restaurant's staff have any business reading even in that form.

The documents are named after the window they count rather than reset in place,
so every instance computes the same name from the same clock and they share a
counter without coordinating. They are removed by a **TTL policy on
`scanRateLimits.expiresAt`**, which is created by hand and has no Nx target -
the third manual step in this epic, beside the rules and the indexes. Until it
exists the collection grows: a document per bucket per minute.

**`/menus` stayed shut, and that is the decision rather than an omission**
(issue [#1102], `RD-TS-7`). A public menu page needs the restaurant's name as
well as its dishes, and `/restaurants/{id}` carries `ownerUserId`,
`claimStatus` and the whole `tableOrdering` configuration - so opening a read
rule wide enough to render the page would publish operations data with it.
`loadPublicMenu` assembles both halves field by field instead, which is what
keeps "the public path exposes the menu only" true as those documents grow. It
is `public`, App-Check enforced, writes nothing, and refuses on four grounds
that are all about there being nothing to read - never about ordering, because
a restaurant that takes no orders is the case it exists for.

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
deliberate, and it is the rollout step issue [#1078] asks for: merge, then run
the suite, then deploy, then watch production for newly denied legitimate paths.

```bash
npx nx firebase-deploy-rules bite-tribe-firebase
```

Rolling back is deploying the previous version of the file, which takes about a
minute. `storage.rules` is still open and is issue [#1350], filed separately.

## Functions Pattern

- Frontend-requested backend work uses callable functions.
- Firestore and Storage side effects use triggers.
- Function exports live in `apps/bite-tribe-firebase/functions/src/index.ts`.
- Backend functions live under `apps/bite-tribe-firebase/functions/src/functions`.
- Callable functions should validate `request.auth` before user-scoped reads.
- **A collection-group query needs a rule that reads the document, and the query then carries the permission.** A `match /{path=**}/orders/{orderId}` has no `{restaurantId}` to scope it with, so the rule reads `resource.data.restaurantId` - and Firestore admits such a query only when its constraints prove the condition. The client therefore has to send the matching `where`, and a query without it is refused whole rather than widened to every restaurant in the database. Issue [#1105]'s staff order queue is the first client query in this repository shaped that way, and `firestore-rules.emulator-spec.ts` asserts both halves: the constrained query succeeds for the restaurant's own people and the unconstrained one is refused. The same mechanism scopes a guest to their own orders (`RD-TS-12`).
- **A derived document name can replace a query, an index and a rule clause.** Issue [#1106]'s calls for a waiter are named `{n}_{tableId}_{kind}` under the restaurant, which bounds the collection at two documents per table however busy the room is - so both staff screens subscribe to the whole subcollection with no `where` at all, admitted by `readsFloorPlan(restaurantId)` from the path, and the guest's phone reaches its own by `get` on a name it derives. Compare the order queue one collection above it: orders hang from the visit and are unbounded, which forced a collection-group query, a `where` doubling as the permission, a second `where` to bound the read and two index exemptions deployed by hand. The same trick makes the repeated tap harmless, because the second write addresses the first one's document - a uniqueness constraint Firestore has no other way to express, and the same reason `tableSessionId` is derived.
- Firestore index configuration is code. `apps/bite-tribe-firebase/firestore.indexes.json` holds the composite indexes and the single-field exemptions that collection-group queries need, and deploys on its own through the `bite-tribe-firebase:firebase-deploy-indexes` Nx target (`npm run deploy:indexes`), separately from functions and rules. That one deploy stays manual while functions deploy from CI, because the Firestore API builds an index in the background and the CLI returns before it is usable. The pipeline's `deploy-functions` job asserts the declared indexes are already live instead of deploying them. `firestore-collection-group-indexes.spec.ts` pairs every collection-group query in the **functions** source with an entry there; a query made by a **client** is outside what that spec can see, so issue [#1105]'s queue carries its own check in `libs/bite-tribe-business/table-management/data-access/src/lib/__specs__/table-order-queue-indexes.spec.ts`. Neither can prove the deploy has run. See [Implementation - Firebase Functions](../implementation/firebase-functions.md).

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

The equivalent verified control is the callable in front of the API: App Check enforced through `onAppCheck`, plus an authenticated caller. `apps/bite-tribe-firebase/functions/src/__specs__/google-maps-request-path.spec.ts` fails the build when a client reaches a Google Maps host, when a native Maps or Places SDK is linked, or when a callable is registered without App Check enforcement. See [issue-1245](../records/issue-1245.md).

## Adding A Web App To The Project

Creating a Firebase Hosting site does **not** authorise the new domain anywhere else. Three separate allowlists have to be edited by hand, in three different consoles, and none of them is mentioned when the site is created. Verified on 5 September 2026 while bringing up `bite-tribe-admin` (issue [#1469]).

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

**Roles live in the export, in each account's `customAttributes`.** Since issue [#1469] the two privileged apps require a role _at sign-in_, so an account without one cannot log in at all — and the refusal is the same generic error a wrong password gives, by design. An account whose claim is missing from the export therefore presents as "the password is wrong", which is the confusing failure to expect after regenerating it.

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

[#1072]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1072
[#1073]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1073
[#1078]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1078
[#1079]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1079
[#1086]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1086
[#1092]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1092
[#1095]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1095
[#1096]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1096
[#1100]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1100
[#1101]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1101
[#1102]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1102
[#1105]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1105
[#1106]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1106
[#1107]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1107
[#1350]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1350
[#1469]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1469
[#1537]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1537
