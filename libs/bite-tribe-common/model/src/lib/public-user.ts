export interface PublicUser {
  displayName: string;
  normalizedDisplayName?: string;
  fullName?: string;
  /**
   * How the user wants to be referred to, as they typed it (issue #1826).
   * Trimmed, at most `PRONOUNS_MAX_LENGTH` characters, and absent rather
   * than empty. Shown in the profile header only, never inferred or analysed.
   */
  pronouns?: string;
  email: string;
  photoUrl: string;
  /**
   * Where a newly chosen profile photo stands (GitHub issues #1953 and #2140),
   * as `Bite.imageStatus` does for a Bite photo. `photoUrl` keeps the previous
   * photo while a new one is `pending`; the storage finalize trigger
   * `setUserPhotoUrlOnUpload` runs the image check, then either points it at
   * the new object and writes `uploaded`, or deletes the object and writes
   * `refused`, keeping the previous photo. The client writes `failed` when
   * the transfer errors or stalls. Absent on a profile whose photo was never
   * replaced this way.
   */
  photoStatus?: 'pending' | 'uploaded' | 'failed' | 'refused';
  /**
   * Why the image check refused the new photo, present only while
   * `photoStatus` is `refused`. Written by `setUserPhotoUrlOnUpload` alone
   * (issue #2140).
   */
  photoRefusalCategory?: string;
  /** When the `pending` upload started, so an abandoned one can read as failed. */
  photoUploadStartedAtTimestamp?: number;
  userId: string;
  city?: string;
  about?: string;
  public?: boolean;
  biteCount?: number;
  followersCount?: number;
  followingCount?: number;
  subscriptionTier?: number;
  countryCodes?: string[];
  /**
   * The weekly top-3 badges the user holds (issue #2031): at most one per
   * weekly list, written by the Monday reset and held until the next one.
   * Backend-owned, like `countryCodes`.
   */
  weeklyBadges?: WeeklyBadge[];
  /**
   * The weekly posting streak (issue #2146): consecutive Monday-to-Sunday
   * weeks in Europe/Zurich with a Bite, written by the Bite create trigger and
   * the Monday resync. Backend-owned. Shown on the own profile only (#2148).
   */
  postingStreak?: PostingStreak;

  createdAt?: string;
  createdAtTimestamp?: number;
  updatedAt?: string;
  updatedAtTimestamp?: number;
  lastSeen?: string;
  lastSeenTimestamp?: number;
  appVersion?: string;
  appBuildNumber?: string;
  emailVerified?: boolean;
  emailVerificationRequired?: boolean;
  emailVerificationProvider?: 'password' | 'trusted-provider' | 'unknown';
  emailVerificationReminderCount?: number;
  emailVerificationLastSentAt?: string;
  emailVerificationLastSentAtTimestamp?: number;
  emailVerificationManualLastSentAt?: string;
  emailVerificationManualLastSentAtTimestamp?: number;

  onboardingCompletedAt?: string;
  onboardingCompletedAtTimestamp?: number;
  onboardingVersion?: number;

  /** The coach mark surfaces this account has dismissed (issue #1851). */
  coachMarksSeen?: string[];
}

/** A weekly list a badge is won on (issue #2031). */
export type WeeklyBadgeBoard = 'thisWeek' | 'mostLiked';

/** A place from 1 to 3 on one weekly list, and the week it was won in. */
export interface WeeklyBadge {
  board: WeeklyBadgeBoard;
  place: number;
  week: string;
}

/** A weekly posting streak as the backend stores it (issue #2146). */
export interface PostingStreak {
  weeks: number;
  /** The Zurich Monday of the run's newest week, `YYYY-MM-DD`, or null. */
  lastPostingWeek: string | null;
}
