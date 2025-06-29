import { PublicUser, Settings } from 'model';

export type AppSlice = {
  position?: any;
  settings: Settings;
  loading?: {
    home?: boolean;
  };
  profile?: PublicUser;
};
