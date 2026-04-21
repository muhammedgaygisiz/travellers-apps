export interface TriedOutBucketlistBite {
  biteId: string;
  date: string;
  timestamp: number;
}

export interface Bucketlist {
  id: string;
  userId: string;
  name: string;
  biteIds: string[];
  triedOutBites?: TriedOutBucketlistBite[];
  biteTrailId?: string;

  createdAt?: string;
  createdAtTimestamp?: number;
  updatedAt?: string;
  updatedAtTimestamp?: number;
}
