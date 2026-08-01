# User

- ## Purpose

  A User represents a person, creator, organisation, or restaurant-facing profile participating in BiteTribe.

  Users are the trust layer around Bites. They create Bites, follow each other, save food experiences, rate BiteTrails, and provide the social context that helps other people decide what to eat.

- ## Why It Exists

  The goal of a User is to answer:

  > Who shared this food experience, and can I trust their context?

  A Bite without creator context is weaker because BiteTribe depends on human food experiences, not anonymous listings.

- ## Business Rules
- A User can create many Bites.
- A User can have a public or private profile.
- A public profile is visible to other BiteTribe users inside the app. It is not
  a shareable link: profiles have no share action and no deep link, by design.
  Sharing is a [[Bite]] capability. See [[issue-1190]].
- A User can follow and be followed by other users.
- A User can save Bites to bucket lists.
- A User can save a BiteTrail as a bucket list.
- A User can like and review Bites.
- A User can rate a BiteTrail once.
- A User can represent an individual, organisation, or restaurant-like profile.
- Public profile quality affects trust in Bites and BiteTrails.
- Email/password users should verify their email address; linked Google or Apple provider accounts are treated as trusted for this lifecycle.
- ## Required Data

  Current profile model fields:

  | Field        | Current name in code | Description                                    |
  | ------------ | -------------------- | ---------------------------------------------- |
  | User id      | `userId`             | Auth/user identifier and profile document id.  |
  | Display name | `displayName`        | Public display identity.                       |
  | Email        | `email`              | Account email, also used in search.            |
  | Photo        | `photoUrl`           | Profile image URL or uploaded image reference. |

- ## Optional Data
- `fullName`
- `city`
- `about`
- `public`
- `biteCount`
- `countryCodes`
- `subscriptionTier`
- `isOrganisation`
- `isRestaurant`
- `createdAt`
- `createdAtTimestamp`
- `updatedAt`
- `updatedAtTimestamp`
- `lastSeen`
- `lastSeenTimestamp`
- `appVersion`
- `appBuildNumber`
- `emailVerified`
- `emailVerificationRequired`
- `emailVerificationProvider`
- `emailVerificationReminderCount`
- `emailVerificationLastSentAt`
- `emailVerificationLastSentAtTimestamp`
- `emailVerificationManualLastSentAt`
- `emailVerificationManualLastSentAtTimestamp`
- `onboardingCompletedAt`
- `onboardingCompletedAtTimestamp`
- `onboardingVersion`
- ## Relationships

  ```text
  User
  |-- Bites (creator)
  |-- Bucket Lists
  |-- Likes
  |-- Reviews
  |-- Followers
  |-- Following
  |-- BiteTrails (owner, organisation, or curator)
  |-- BiteTrail ratings
  ```

- ## Lifecycle

  ```text
  Authenticated
  |
  Profile created
  |
  Public/private profile chosen
  |
  Profile maintained
  |
  Creates or discovers Bites
  |
  Follows, likes, reviews, saves, or curates
  |
  Last seen and contribution signals updated
  |
  Account deleted (profile removed, Bites survive without an author)
  ```

  Current implementation notes:

- A public user document is stored in `/users/{userId}`.
- `saveUser` initializes profile data from the authenticated user.
- Profile images can be uploaded and mirrored into Firebase-backed URLs.
- `updateLastSeen` remains available as the legacy backend callable for older app versions.
- `updateUserMetadata` records the latest activity timestamp plus reported app version/build number for current app versions.
- Email verification metadata is stored on the public user document so the app can show non-blocking prompts and other users can see whether the profile email is verified.
- Email verification reminders are only required for email/password accounts without a trusted linked provider.
- Onboarding completion is stored on the public user document (`onboardingCompletedAt`, `onboardingCompletedAtTimestamp`, `onboardingVersion`). The absence of the flag routes an authenticated user into the blocking onboarding assistant; the finish step writes it. `onboardingVersion` leaves room for future re-onboarding.
- An auth-scoped entry gate (`onboardingGuard`) redirects users without the completion flag to the onboarding route and blocks every other authenticated route until completion; `onboardingCompletedGuard` keeps completed users out of the route. See [[epic-850]].
- Display names are unique, enforced case-insensitively (normalized by trim + lowercase; original casing preserved for display). A claim document `/displayNames/{normalizedDisplayName}` is written transactionally by the `claimDisplayName` callable so two users cannot take the same normalized name concurrently; renaming releases the old claim and takes the new one in the same transaction and keeps `/users/{uid}.displayName` plus `normalizedDisplayName` in sync. `checkDisplayNameAvailability` is a read-only advisory check. The profile edit flow claims the name before saving and shows a localized error when it is taken. `backfillDisplayNameClaimsCallable` claims existing users' names oldest-first (first-come keeps the name on a normalization collision) so enforcement can be switched on safely. See [[epic-850]].
- `subscriptionTier` is currently written as `1` by `createUserOnAuthCreate` for every new account and is only read for display in the profile and settings pages. Nothing enforces it, and `firestore.rules` still allows any authenticated user to write any document, so it is not a trustworthy access signal today. [[epic-1122]] makes the entitlement server-owned and turns this field into a backend-written display mirror. See [[Subscription]].
- Follow relationships are stored under `/users/{targetUserId}/followers/{currentUserId}` and `/users/{currentUserId}/following/{targetUserId}`.
- A User can delete their own account from the app. `deleteOwnAccount` removes the public user document, its follow and push-token subcollections, the mirrored follow edge on other users, the display-name claim, settings, reviews, likes, bucket lists, BiteTrail ratings and profile images, then deletes the Firebase Auth account last. Bites are kept with `userId` removed so the shared content graph survives, and a Bite without a `userId` renders like a private user's Bite. The full per-category contract is in [[UC - Use Account And Legal Flows]]; the reasoning is in [[issue-1182]].
- Bite count and country-code aggregates support leaderboard rank, profile contribution display, and profile badges.
- ## Permissions
- Guest
  - Guest behavior is not the main authenticated app flow today.
- Registered user
  - Create and update own profile.
  - Choose public/private profile state.
  - Follow and unfollow users.
  - Create Bites.
  - Like, review, and save food experiences.
  - Create bucket lists and save BiteTrails.
- Admin
  - Moderation and user administration are future or operational capabilities, not clearly modeled in the current User domain code.
- ## Use Cases

  Supported today:

- Create public/private user profile.
- Edit profile.
- Upload profile image.
- View own profile.
- View public profile.
- Follow and unfollow users.
- View followers and following.
- Search users by display name, full name, or email.
- Update last seen.
- Track latest reported app version and build number.
- Show and resend email verification prompts for eligible email/password accounts.
- Show bite count in leaderboard.
- Show contribution badges on profile.
- Receive ranking-change notifications.

  Related future or expanding use cases:

- Onboarding assistant.
- Better privacy guidance.
- Organisation profile management.
- Restaurant profile ownership.
- Creator credibility and badges.
- ## Related Epics
- Onboarding assistant
- Search
- Marketplace
- BiteTrail gamification
- Organisation and BiteTrail packages
- [[epic-1122]] entitlement foundation and Pro gating
- ## Technical Implementation

  Firestore:

  ```text
  /users/{userId}
  /users/{userId}/followers/{followerUserId}
  /users/{userId}/following/{followedUserId}
  /displayNames/{normalizedDisplayName}
  /biteTrails/{biteTrailId}/ratings/{userId}
  ```

  Frontend and shared model:

  ```text
  libs/bite-tribe-common/model/src/lib/public-user.ts
  libs/bite-tribe-common/model/src/lib/user.ts
  libs/bite-tribe/api/src/lib/profile-api.service.ts
  libs/bite-tribe/profile/page
  libs/bite-tribe/followers/page
  libs/bite-tribe/store/src/lib/app
  ```

  Cloud Functions:

  ```text
  createUserOnAuthCreate
  deleteOwnAccount
  claimDisplayName
  checkDisplayNameAvailability
  backfillDisplayNameClaimsCallable
  updateLastSeen
  updateUserMetadata
  syncEmailVerificationStatus
  resendEmailVerification
  sendEmailVerificationReminders
  searchUsers
  loadLeaderboard
  incrementBiteCountOnBiteCreate
  resyncBiteCounts
  sendDailyLeaderboardNotification
  notifyUserOnNewFollower
  ```

  Storage:

  ```text
  images/users/{userId}/{filename}
  ```

- ## Current Limitations
- Organisation and restaurant user profile behavior exists in fields but is still evolving as a product concept.
- Public/private visibility needs clearer user-facing guidance.
- Admin moderation is not clearly modeled.
- Profile trust and creator credibility are mostly implicit.
- Onboarding after registration is not complete.
- ## Future Ideas
- Guided onboarding for username, public profile, currency, and first actions.
- Creator profile completeness score.
- Creator badges.
- Organisation-owned creator teams.
- Clearer public/private profile controls.
- Better trust signals for search and Bite ranking.
- ## Sources Used
- [[Mission]]
- [[Principles]]
- [[Glossary]]
- Use Cases section in [[SSOT]]
- [[Personas]]
- [[Bite]]
