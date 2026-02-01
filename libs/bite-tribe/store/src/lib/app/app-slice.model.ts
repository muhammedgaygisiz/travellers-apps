import type { Geopoint, PublicUser, Settings, UploadParams } from 'model';

export type AppSlice = {
  position?: Geopoint;
  settings: Settings;
  loading?: {
    home?: boolean;
    followers?: boolean;
    uploadingImageForBite?: string;
  };
  reloading?: {
    home?: boolean;
  };
  uploadingProgressForBiteImage?: {
    [biteId: string]: UploadParams;
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
};
