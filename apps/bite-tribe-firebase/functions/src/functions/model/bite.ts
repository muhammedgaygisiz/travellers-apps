export type Bite = {
  userId: string;
  name: string;
  id: string;
  place: string;
  price: number;
  position?: {
    latitude?: unknown;
    longitude?: unknown;
  };
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  formatted?: string;
  addressStatus?: 'pending' | 'resolved' | 'failed';
  updatedAt?: string;
  updatedAtTimestamp?: number;
  currency?: string;
  rating?: number;
  imagePath?: string;
  thumbup?: number;
  drooling?: number;
  mindblown?: number;
};
