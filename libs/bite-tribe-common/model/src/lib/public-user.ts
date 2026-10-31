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
  userId: string;
  city?: string;
  about?: string;
  public?: boolean;
  biteCount?: number;
  followersCount?: number;
  followingCount?: number;
  subscriptionTier?: number;
  countryCodes?: string[];

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
