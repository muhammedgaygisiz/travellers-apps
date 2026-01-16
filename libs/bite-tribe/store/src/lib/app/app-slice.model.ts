import type { Geopoint, PublicUser, Settings } from 'model';

export type AppSlice = {
  position?: Geopoint;
  settings: Settings;
  loading?: {
    home?: boolean;
  };
  reloading?: {
    home?: boolean;
  };
  profile?: PublicUser;
  followedBy: string[];
  exchangeRates: Record<string, number>;
  errorLoadingGpsPosition: boolean;
};
