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
  sorting?: {
    home?: string;
    myBites?: string;
  };
  profile?: PublicUser;
  homeFilters?: string[];
  homeDistance?: number;
  exchangeRates: Record<string, number>;
  maxPriceFilter?: number;
  errorLoadingGpsPosition: boolean;
};
