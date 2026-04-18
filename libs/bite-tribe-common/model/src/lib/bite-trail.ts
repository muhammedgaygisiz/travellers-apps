export interface BiteTrail {
  id: string;
  ownerId: string;
  name: string;
  biteIds: string[];
  soldCount?: number;
  imagePath: string;
  ownerImagePath: string;
  ownerName: string;
  location: string;
  description: string;
  price: number;
  currency: string;

  createdAt?: string;
  createdAtTimestamp?: number;
  updatedAt?: string;
  updatedAtTimestamp?: number;
}
