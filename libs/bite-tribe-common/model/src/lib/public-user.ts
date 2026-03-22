export interface PublicUser {
  displayName: string;
  email: string;
  photoUrl: string;
  userId: string;
  city?: string;
  about?: string;
  public?: boolean;
  subscriptionTier?: number;
  isOrganisation?: boolean;
  isRestaurant?: boolean;

  createdAt?: string;
  createdAtTimestamp?: number;
  updatedAt?: string;
  updatedAtTimestamp?: number;
}
