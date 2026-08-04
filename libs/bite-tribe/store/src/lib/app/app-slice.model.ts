import type { Geopoint, PublicUser, Settings } from 'model';
import type { LocationPermissionState } from 'geolocation';

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
  /**
   * The last feed synchronization did not deliver bites. It is kept apart from
   * {@link AppSlice.errorLoadingGpsPosition} so the feed's own failure is not
   * reported as a location problem, and the other way round.
   */
  errorLoadingBites: boolean;
  /**
   * What the OS said about location access the last time a position read was
   * attempted. A failed read alone cannot tell a denial apart from a device
   * that simply has no fix, and only a denial needs the settings-page handoff,
   * so the recovery UI branches on this rather than on the error flag.
   */
  locationPermissionState?: LocationPermissionState;
};
