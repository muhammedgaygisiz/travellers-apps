# ADR-0002 Firebase Backend

## Status

Accepted.

## Context

BiteTribe needs authenticated user identity, realtime product data, image storage, backend callables, storage and Firestore triggers, scheduled jobs, local emulators, analytics, Crashlytics, and mobile-friendly platform integration.

The current implementation already uses Firebase across the frontend, backend, storage, auth, analytics, and native runtime layers.

## Decision

BiteTribe uses Firebase as the primary backend platform.

Firestore stores product data. Firebase Storage stores user-generated and product images. Firebase Authentication provides user identity. Firebase Functions own backend callables, triggers, scheduled jobs, and storage finalization logic. Firebase emulators support local backend development. Firebase Analytics and Crashlytics provide telemetry and failure signals.

## Consequences

- Backend-owned behavior should live in Firebase Functions when query semantics, security, aggregation, or side effects should not be duplicated in the client.
- Client features may use shared Firebase access through `libs/bite-tribe/api` and feature data-access libraries.
- Auth-scoped callables should validate `request.auth` before user-scoped reads or writes.
- Storage image flows can rely on backend finalization, such as setting usable image paths after upload.
- Emulator support remains important for local development.
- App Check, security rules, indexes, and operational logging are part of backend quality, not optional infrastructure details.

## Trade-Offs

- Firebase accelerates product delivery and native app integration.
- Firestore query semantics and missing-field behavior require careful modeling and backfills.
- Some behavior may need migration from direct frontend Firebase access to callable functions as trust boundaries mature.
- Platform-specific App Check and native plugin setup can require additional runtime verification beyond TypeScript tests.

## Links

- [[Architecture - Firebase]]
- [[Architecture - Auth]]
- [[Architecture - Storage]]
- [[Architecture - Analytics]]
- [[Implementation - Firebase Functions]]
