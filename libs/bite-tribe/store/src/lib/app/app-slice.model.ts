import { Settings } from 'model';

export type AppSlice = {
  position?: any;
  settings: Settings;
  isPublicProfile: boolean;
  loading?: {
    home?: boolean;
  };
};
