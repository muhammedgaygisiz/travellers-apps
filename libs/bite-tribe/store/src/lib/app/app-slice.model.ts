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
  /**
   * The accounts the signed-in user has blocked (GitHub issue #1609). Content
   * by them is filtered out of every surface that reads from the store, so a
   * block takes effect on what is already loaded rather than on the next
   * fetch. Loaded once after login and kept current by the block actions.
   */
  blockedUserIds: string[];
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
