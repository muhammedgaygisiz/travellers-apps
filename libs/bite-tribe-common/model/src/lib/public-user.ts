export interface PublicUser {
  displayName: string;
  fullName?: string;
  email: string;
  photoUrl: string;
  userId: string;
  city?: string;
  about?: string;
  public?: boolean;
  biteCount?: number;
  subscriptionTier?: number;
  isOrganisation?: boolean;
  isRestaurant?: boolean;
  countryCodes?: string[];

  createdAt?: string;
  createdAtTimestamp?: number;
  updatedAt?: string;
  updatedAtTimestamp?: number;
  lastSeen?: string;
  lastSeenTimestamp?: number;
  appVersion?: string;
  appBuildNumber?: string;
}
