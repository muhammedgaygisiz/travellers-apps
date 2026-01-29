export interface Review {
  author: string;
  biteId: string;
  review: string;
  id: string;

  createdAt?: string;
  createdAtTimestamp?: number;
  updatedAt?: string;
  updatedAtTimestamp?: number;
}
