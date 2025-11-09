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
  profile?: PublicUser;
  homeFilters?: string[];
  homeDistance?: number;
  exchangeRates: Record<string, number>;
  maxPriceFilter?: number;
  homeSorting?: string;
  myBitesSorting?: string;
  errorLoadingGpsPosition: boolean;
};
