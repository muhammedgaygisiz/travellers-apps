export interface Bucketlist {
  id: string;
  userId: string;
  name: string;
  biteIds: string[];
  biteTrailId?: string;

  createdAt?: string;
  createdAtTimestamp?: number;
  updatedAt?: string;
  updatedAtTimestamp?: number;
}
