export type RestaurantClaimDecision =
  'pending' | 'approved' | 'rejected' | 'withdrawn' | 'superseded';

export interface RestaurantClaim {
  id: string;
  restaurantId: string;
  requestedByUserId: string;
  status: RestaurantClaimDecision;

  evidenceNotes?: string;

  reviewedByUserId?: string;
  reviewedAt?: string;
  reviewedAtTimestamp?: number;
  decisionReason?: string;

  createdAt?: string;
  createdAtTimestamp?: number;
  updatedAt?: string;
  updatedAtTimestamp?: number;
}
