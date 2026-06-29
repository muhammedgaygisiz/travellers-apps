# Architecture - Auth

## Purpose

Auth establishes user identity for app access, profile creation, user-scoped data, analytics identity, and backend callable authorization.

## Main Flow

```text
User authenticates
|
AuthService tracks current user
|
Routes are guarded
|
Profile data is created or loaded
|
Store and API services use user identity
|
Backend callables validate request.auth where required
```

## Auth Surfaces

- `AuthService` wraps Capacitor Firebase Authentication.
- `withAuthRoutes` provides shared auth routes.
- `authGuard` protects authenticated routes.
- `startGuard` controls the start route.
- `createUserOnAuthCreate` initializes profile-related backend behavior.
- `updateLastSeen` records activity through a legacy callable for older app versions.
- `updateUserMetadata` records current app activity and client version/build metadata through a callable.

## Supported Auth Modes

- Email and password.
- Google account.
- Apple account.
- Email verification.
- Logout.

## Code Anchors

```text
libs/common/ta-firestore/src/lib/auth.service.ts
libs/common/ta-firestore/src/lib/auth.guard.ts
libs/common/ta-firestore/src/lib/start.guard.ts
libs/common/ui/auth
libs/bite-tribe/shell/src/lib/routes.ts
libs/bite-tribe-business/shell/src/lib/routes.ts
apps/bite-tribe-firebase/functions/src/functions/create-user-on-auth-create.ts
apps/bite-tribe-firebase/functions/src/functions/update-last-seen.ts
apps/bite-tribe-firebase/functions/src/functions/update-user-metadata.ts
```

## Current Limitations

- Onboarding after registration is still a product gap.
- Public/private profile intent needs clearer user guidance.
- Backend callable auth checks need to remain consistent as more write/query logic moves server-side.
