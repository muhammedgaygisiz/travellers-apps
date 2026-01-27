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
  profileMetadata: {
    followers: number;
    following: number;
    isFollowedByMe: boolean;
  };
  exchangeRates: Record<string, number>;
  errorLoadingGpsPosition: boolean;
  totalNumberBites: number;
  totalNumberUsers: number;
  users: PublicUser[];
};
