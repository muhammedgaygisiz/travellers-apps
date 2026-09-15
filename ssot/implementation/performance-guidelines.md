# Implementation - Performance Guidelines

## Purpose

These are the rules that came out of profiling the Android app against production data, where a dense feed made ordinary-looking code cost seconds of blocked main thread. They are written as rules with the measurement that produced them, because none of them are visible from reading the code that breaks them.

The two architectural rules that belong to state ownership live in [[Architecture - State Management]]: a reducer must return the same state reference when nothing changed, and a derived read model belongs to whoever produced the list. This page covers what sits on top of them.

## Measure On The Device, Against Real Data

A dense city is a different application from a test account. The bug behind all of this reproduced only where a single position returned hundreds of Bites, and every estimate made from reading the code was wrong by an order of magnitude in one direction or the other.

The release build is profilable without a debug build: the WebView renderer registers as a Perfetto producer, so `track_event` plus `org.chromium.sampler_profiler` gives JS stacks off a store build. A debug build additionally exposes `@webview_devtools_remote_<pid>`, which allows the Chrome DevTools protocol - `Profiler.start`, `Runtime.evaluate`, live DOM reads.

Two measurements that separate the cases quickly:

- `dumpsys gfxinfo <package>` distinguishes a rendering problem from an unresponsive one. Healthy frame times with a high `Number High input latency` means the app is drawing fine and not answering, which points inside the WebView rather than at Android.
- Counting `requestAnimationFrame` callbacks during the interaction distinguishes blocked from waiting. Two frames in 1.6 s is a blocked main thread. A profile that looks mostly idle is waiting on IO.

### A Locally Signed Build Needs Two Registrations Before It Can Reach Production Data

Profiling against real data means running a locally built app against the production project, and two separate gates reject that build. Both cost more time to rediscover than to read.

**Google Sign-In needs the build's signing certificate registered.** Google matches the calling app's SHA-1 against the fingerprints on the Firebase Android app, and a build signed with the local debug keystore matches none of them, so sign-in fails with `NoCredentialException: No credentials available` rather than anything that names the cause. Add the debug keystore's SHA-1 under Project settings, Your apps, Add fingerprint.

Note that the **upload key is not registered either**, and signing the build with it does not help. Play re-signs every release with its own app-signing key, so the fingerprints that production users authenticate against belong to Play, not to the keystore in `keystore.properties`. Read the debug keystore's fingerprint with:

```text
keytool -list -v -keystore ~/.android/debug.keystore -storepass android -alias androiddebugkey
```

**App Check needs a debug token.** Play Integrity only attests a build installed from Play, so a locally signed one cannot obtain a token and every callable is rejected while `enforceAppCheck` is on. The debug variant installs `DebugAppCheckProviderFactory`, which prints a secret to logcat on first run; that secret has to be registered under App Check, Apps, Manage debug tokens.

Both are credentials with real reach: a debug token bypasses App Check for whoever holds it. **Revoke both when the profiling session ends.** Leave the long-standing fingerprints alone - the ones referenced by `google-services.json` back Google Sign-In and the one in `.well-known/assetlinks.json` backs App Links, so removing either breaks production.

## A Derivation Runs Whenever Anything It Reads Changes

A selector hanging off a broadly shared slice runs on every change to that slice, not only when its own inputs are meaningful. `nearbyRestaurants` is only needed by the create and edit Bite forms, but it derives from the whole Bite feed, so it ran on every like, every feed load and every GPS update.

Two rules follow.

**An expensive derivation must not be subscribed for the lifetime of the app.** `@Injectable({ providedIn: 'root' })` combined with a `toSignal(...)` field initializer subscribes at construction and never stops, so the moment anything injects that service the derivation is live for the rest of the session. That is how a form-only selector ended up running on the feed.

**A derivation must be identity-stable to be memoizable.** Rebuilding the array, or the objects inside it, defeats every `createSelector` above it even when nothing changed. Hand back the same array when no element changed, and the same element when that element did not - then an unrelated store change costs nothing and an `OnPush` card whose input is unchanged does not re-render. Measured: one like re-rendered 1 card instead of 50.

## Fuzzy Matching Builds An Index Per Call

`getSimilarityScore` calls `fast-fuzzy`'s `search(term, [candidate])`, which constructs a search index for that one candidate on every call. It reads like a string comparison and costs far more than one.

**Never call it from a loop whose length is driven by feed size**, and never from a nested one. The restaurant-name dedup compared every place against every other place, one entry per Bite rather than one per distinct name, which on a feed of 440 Bites is on the order of 190,000 index builds and over a second of blocked main thread on every recompute.

Where a fuzzy pass is genuinely needed:

- collapse the input to distinct values before any quadratic part starts
- memoize the verdicts, since the same pairs recur across recomputes and the comparison is symmetric
- bound the caches so a long session cannot leak

Measured on the like interaction: 1550 ms to about 40 ms.

## Cost Must Be Bounded By The Request, Not By History

Answering "which of these did I react to" has two shapes, and only one of them stays bounded.

Reading one document per item costs one read per item in the list. Querying everything the user ever liked costs their whole history - 2141 documents where 500 were wanted, growing forever, charged on every feed load. The second looks cheaper because it is one query, and bills far more.

**Prefer the shape whose cost is tied to the size of the request.** A batched read of exactly the documents the response covers is bounded by the response; a query filtered only by user is bounded by nothing.

Batched reads should also be issued together rather than in sequence, so the response waits for the slowest chunk instead of the sum of them.

## Trust The Compiler, Not The Test Run

`nx test` passing does not mean the code compiles. `ts-jest` under `isolatedModules` skips full type checking, so a type error can sit behind a green suite and only surface in the application build.

When a change is being validated on a device, verify that the build actually produced a new bundle before believing the measurement. Check the exit code rather than grepping the output for a success string, and confirm the artifact changed - a content-hashed chunk name that has not moved means the old code is still running. A measurement taken against a stale build is worse than no measurement, because it reads as evidence.

## Related Pages

- [[Architecture - State Management]]
- [[Implementation - Feature Patterns]]
- [[Current State - Known Issues]]

Open work bringing existing code in line with these rules is tracked under GitHub issue #1359.
