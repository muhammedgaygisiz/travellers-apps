import { PublicUser, Settings } from 'model';

export type AppSlice = {
  position?: any;
  settings: Settings;
  loading?: {
    home?: boolean;
  };
  reloading?: {
    home?: boolean;
  };
  sortingAndFiltering?: {
    sorting?: {
      home?: string;
      myBites?: string;
      bucketlists?: string;
    };
    filtering?: {
      home?: {
        filters: string[];
        distance?: number;
        maxPrice?: number;
      };
    };
  };
  profile?: PublicUser;
  exchangeRates: Record<string, number>;
  errorLoadingGpsPosition: boolean;
};
