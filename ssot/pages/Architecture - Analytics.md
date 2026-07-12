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

## Common Events

```text
setCurrentScreen
setUserId
exception
```

## Product Event Taxonomy

Launch-critical product events are defined once as a typed taxonomy and emitted
through `AnalyticsService` from the owning integration layer (not from UI
components). The service wraps `FirebaseAnalytics.logEvent`, never throws, and
no-ops in the business app.

| Category   | Event                | Trigger                         |
| ---------- | -------------------- | ------------------------------- |
| Activation | `sign_up`            | Successful registration         |
| Creation   | `bite_created`       | New Bite persisted              |
| Creation   | `bucketlist_created` | Bucket list created             |
| Creation   | `bucketlist_rated`   | BiteTrail rating submitted      |
| Discovery  | `search_performed`   | Search query becomes meaningful |
| Discovery  | `restaurant_viewed`  | Restaurant / place page entered |
| Discovery  | `bite_viewed`        | Bite details page entered       |

Retention and launch monitoring rely on GA4 auto-collected events
(`first_open`, `session_start`) plus the existing `exception` event, so they
need no additional instrumentation.

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
```

## Current Limitations

- Screen tracking is spread across route containers.
- Analytics support depends on platform/runtime support.
