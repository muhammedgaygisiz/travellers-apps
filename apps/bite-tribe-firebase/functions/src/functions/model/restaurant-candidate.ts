interface RestaurantCandidatePosition {
  latitude: number;
  longitude: number;
}

export type RestaurantCandidateStatus =
  | 'pending'
  | 'verified'
  | 'dismissed'
  | 'merged';

export interface RestaurantCandidateEvidence {
  biteCount: number;
  placeNames: Record<string, number>;
  averageRating?: number;
  imagePaths?: string[];
}

export interface RestaurantCandidate {
  id: string;
  name: string;
  normalizedName: string;
  status: RestaurantCandidateStatus;
  position: RestaurantCandidatePosition;
  geohash: string;
  biteIds: string[];
  evidence: RestaurantCandidateEvidence;
  verifiedRestaurantId?: string;
  verifiedAt?: string;
  verifiedAtTimestamp?: number;
  verifiedByUserId?: string;
  mergedIntoCandidateId?: string;
  createdAt?: string;
  createdAtTimestamp?: number;
  updatedAt?: string;
  updatedAtTimestamp?: number;
}
