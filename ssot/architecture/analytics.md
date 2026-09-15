# Architecture - Analytics

## Purpose

Analytics records screen context, user identity, and exception events so app usage and failures can be understood.

## Main Surfaces

- Capacitor Firebase Analytics records native/mobile analytics.
- Firebase Web Analytics is provided through `provideFirestoreAnalytics` when supported.
- `FirebaseErrorHandlerService` logs exception events.
- `AuthService` sets analytics user id when a valid user exists.
- Many route containers set the current screen on enter.
- `AnalyticsService` emits the launch-critical product event taxonomy.

## Transport Rule

On a native platform the transport is the **native** SDK, reached through
`@capacitor-firebase/analytics`. Product events (`AnalyticsService`), screen
context (`setCurrentScreen`), user identity (`setUserId`), and the App Check
telemetry in `initialize-firebase-app-check.ts` all go through that plugin,
which resolves to the native SDK on iOS and Android and to the JS SDK on the
web. `FirebaseErrorHandlerService` emits `exception` the same way. The
`getAnalytics(app)` instance behind `FIREBASE_ANALYTICS` is the web transport
and the App Check telemetry fallback; it is not a second native path, and code
that reads it must tolerate `null`, which is what
`provideFirestoreAnalytics` yields where analytics is unsupported.

Two consequences. A disabled **native** collection flag silences the app's own
events on a device, not only the auto-collected ones. And an event sent through
the JS SDK from a native platform lands on a different measurement path than
every other event the same device produces, which is what `exception` did until
[[issue-1387]].

## Collection Flag Rule

The native SDKs persist what `setEnabled` writes - Android in the
`com.google.android.gms.measurement.prefs` SharedPreferences file under
`measurement_enabled`, iOS in its user defaults. The value therefore outlives
the process, the build, and the install that set it, and the Android wrapper's
`android:allowBackup="true"` puts it inside auto-backup's default set.

So the DEV-only `setEnabled({ enabled: false })` in `provide-firestore-utils.ts`
is not scoped to dev. Any build that follows it on the same device inherits it.
Production must therefore **state** the flag rather than trust the SDK default:
the non-dev path calls `setEnabled({ enabled: true })`, on native platforms
only, because on the web the same call sets a per-page-load `ga-disable-*`
window flag that nothing persists and would eagerly initialize web analytics for
apps that never asked for it.

The general rule: a dev-only branch may not leave persistent native state that
no production path asserts back. See [[issue-1387]] for what one unbalanced
call cost.

## Common Events

```text
setCurrentScreen
setUserId
exception
```

## Product Event Taxonomy

Launch-critical product events are defined once as a typed taxonomy and emitted
through `AnalyticsService` from the owning integration layer (not from UI
components). The service wraps `FirebaseAnalytics.logEvent` and never throws.

| Category   | Event                | Trigger                         |
| ---------- | -------------------- | ------------------------------- |
| Activation | `sign_up`            | Successful registration         |
| Creation   | `bite_created`       | New Bite persisted              |
| Creation   | `bucketlist_created` | Bucket list created             |
| Creation   | `bucketlist_rated`   | BiteTrail rating submitted      |
| Discovery  | `search_performed`   | Search query becomes meaningful |
| Discovery  | `restaurant_viewed`  | Restaurant / place page entered |
| Discovery  | `bite_viewed`        | Bite details page entered       |
| Table ops  | `table_*` (7 events) | Staff change a table or a visit |

Retention and launch monitoring rely on GA4 auto-collected events
(`first_open`, `session_start`) plus the existing `exception` event, so they
need no additional instrumentation.

## Surface Rule

The taxonomy spans two apps, and each event names the one it belongs to in
`ANALYTICS_EVENT_SURFACE`. An event whose surface is not the running bundle is
dropped, which is what keeps a `sign_up` from a staff tablet out of the
activation count and a `table_seated` out of the consumer app. The bundle is
read from the `NX_APP_BITE_TRIBE_IS_BUSINESS` flag `env-var-plugin.js` compiles
in; the admin app has no flag of its own and reads as `consumer`, which is what
it already was.

Before issue 1098 the guard was per app: the whole service returned early in
the business app, because every event it knew belonged to the consumer one. The
table operations of [[epic-1071]] are the first events the business app owns.

## One Property, Two Apps

All three shells read the same `measurementId`, so the business app's events
land on the property the launch dashboard reads. Until issue 1098 nothing
initialized analytics there at all, so the business app sent neither product
nor auto-collected events; its first `table_*` event initializes the web SDK,
and the auto-collected `session_start` and `page_view` of every staff shift
follow.

Those carry no event name that distinguishes them, so both apps set the
user-scoped property `app_surface` (`consumer` / `business`) before their first
event. It is set from both now even though nothing filters on it yet: GA4 does
not backfill, and a filter added later over traffic that never carried the
property would exclude nothing. See [[Implementation - Analytics Events]] for
what still has to be filtered.

See [[Implementation - Analytics Events]] for the full parameter table, the
launch dashboard spec, and DebugView verification steps.

## Code Anchors

```text
libs/common/ta-firestore/src/lib/analytics/analytics.service.ts
libs/common/ta-firestore/src/lib/analytics/analytics-events.ts
libs/common/ta-firestore/src/lib/analytics/provide-firestore-analytics.ts
libs/common/ta-firestore/src/lib/analytics/firebase-error-handler.service.ts
libs/common/ta-firestore/src/lib/auth.service.ts
libs/common/ta-firestore/src/lib/provide-firestore-utils.ts
libs/bite-tribe/**/page/src/lib/integration
libs/bite-tribe-business/table-management/page/src/lib/integration/table-plan.service.ts
```

## Current Limitations

- Screen tracking is spread across route containers.
- Analytics support depends on platform/runtime support.
