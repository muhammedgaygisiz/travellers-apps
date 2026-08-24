export interface PublicUser {
  displayName: string;
  normalizedDisplayName?: string;
  fullName?: string;
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
}
