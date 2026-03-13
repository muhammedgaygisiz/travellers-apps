export interface BiteTrail {
  id: string;
  ownerId: string;
  name: string;
  biteIds: string[];

  createdAt?: string;
  createdAtTimestamp?: number;
  updatedAt?: string;
  updatedAtTimestamp?: number;
}
