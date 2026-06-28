# Architecture - Analytics

## Purpose

Analytics records screen context, user identity, and exception events so app usage and failures can be understood.

## Main Surfaces

- Capacitor Firebase Analytics records native/mobile analytics.
- Firebase Web Analytics is provided through `provideFirestoreAnalytics` when supported.
- `FirebaseErrorHandlerService` logs exception events.
- `AuthService` sets analytics user id when a valid user exists.
- Many route containers set the current screen on enter.

## Common Events

```text
setCurrentScreen
setUserId
exception
```

## Code Anchors

```text
libs/common/ta-firestore/src/lib/analytics/provide-firestore-analytics.ts
libs/common/ta-firestore/src/lib/analytics/firebase-error-handler.service.ts
libs/common/ta-firestore/src/lib/auth.service.ts
libs/common/ta-firestore/src/lib/provide-firestore-utils.ts
libs/bite-tribe/**/page/src/lib/integration
```

## Current Limitations

- Screen tracking is spread across route containers.
- Product event taxonomy beyond screen and exception tracking is not formalized in the SSOT yet.
- Analytics support depends on platform/runtime support.
