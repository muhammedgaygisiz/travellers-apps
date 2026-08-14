import { createReducer, on } from '@ngrx/store';
import { AppActions } from './actions';
import { AppSlice } from './app-slice.model';
import { BiteActions } from '../bites/actions';
import { fromAuth } from 'ta-firestore';
import { routerRequestAction } from '@ngrx/router-store';

const CLEAN_PROFILE_METADATA = {
  followers: 0,
  following: 0,
  isFollowedByMe: false,
};

const initialState: AppSlice = {
  profile: undefined,
  settings: {
    location: false,
    emailUpdates: false,
    theme: 'light',
    currency: 'EUR',
    favoriteCurrencies: [],
    nearby: 2000,
    language: 'en',
  },
  loading: {
    home: true,
  },
  exchangeRates: { EUR: 1 },
  errorLoadingGpsPosition: false,
  errorLoadingBites: false,
  profileMetadata: CLEAN_PROFILE_METADATA,
};

export const reducer = createReducer<AppSlice>(
  initialState,
  on(fromAuth.AuthActions.logoutSucceeded, () => initialState),
  on(
    BiteActions.loadedByGPSPositionFromAPI,
    BiteActions.loadedByUserFromAPI,
    BiteActions.loadedByBucketlistFromAPI,
    (state) => ({
      ...state,
      loading: {
        ...state.loading,
        home: false,
      },
      reloading: {
        ...state.reloading,
        home: false,
      },
      errorLoadingBites: false,
    }),
  ),
  // A feed load that failed or outran its budget settles the Home page the same
  // way a successful one does, and raises its own scoped error instead. Leaving
  // the loading flags set kept the feed under an endless skeleton, because only
  // a `loaded...` action ever cleared them (issue #1230).
  on(BiteActions.errorLoadingByGPSPositionFromAPI, (state) => ({
    ...state,
    loading: {
      ...state.loading,
      home: false,
    },
    reloading: {
      ...state.reloading,
      home: false,
    },
    errorLoadingBites: true,
  })),
  on(fromAuth.AuthActions.loginSucceeded, (state) => ({
    ...state,
    loading: {
      ...state.loading,
      home: true,
    },
  })),
  on(AppActions.reloadGPSPosition, (state) => {
    return {
      ...state,
      reloading: {
        home: true,
      },
      // A retry starts from a clean slate: the previous failure is about to be
      // answered, and leaving it up would outlive the attempt it describes.
      errorLoadingBites: false,
    };
  }),
  on(AppActions.errorLoadingGPSPosition, (state, { permissionState }) => ({
    ...state,
    reloading: {
      home: false,
    },
    loading: {
      ...state.loading,
      home: false,
    },
    errorLoadingGpsPosition: true,
    locationPermissionState: permissionState,
  })),
  on(AppActions.clearGPSError, (state) => ({
    ...state,
    errorLoadingGpsPosition: false,
    locationPermissionState: undefined,
  })),
  on(AppActions.loadedGPSPosition, (state, { position }) => {
    const { coords } = position;
    const { latitude, longitude } = coords;

    return {
      ...state,
      position: { latitude, longitude },
      reloading: {
        ...state.reloading,
        home: false,
      },
      errorLoadingGpsPosition: false,
      locationPermissionState: undefined,
    };
  }),
  on(AppActions.updatedGPSPositionWithoutReload, (state, { position }) => {
    const { latitude, longitude } = position.coords;

    // Keep the marker on the user's live position, but leave the bites (loaded
    // for the last meaningful position) untouched so no backend refetch runs.
    //
    // The read still succeeded, so the previous error is stale and has to go:
    // a user who restores location access without moving 100 m lands here, and
    // leaving the flag set kept a "we could not access your location" card up
    // next to a working position (issue #1183).
    //
    // No refetch follows, so this is the last action of the sequence and has to
    // end the initial load itself. `loading.home` is otherwise only cleared by a
    // `loaded...` action, which left the feed under a skeleton for good whenever
    // a re-login resolved to the same position — the state a reconnect on the
    // spot produces (issue #1230).
    return {
      ...state,
      position: { latitude, longitude },
      loading: {
        ...state.loading,
        home: false,
      },
      reloading: {
        ...state.reloading,
        home: false,
      },
      errorLoadingGpsPosition: false,
      locationPermissionState: undefined,
    };
  }),
  on(
    AppActions.loadedSettingsFromAPI,
    AppActions.savedSettings,
    (state, { settings }) => {
      return {
        ...state,
        settings,
      };
    },
  ),
  on(
    AppActions.setPublicProfile,
    AppActions.savedPublicProfile,
    AppActions.updatedPhotoUrlInProfile,
    (state, { profile }) => {
      return {
        ...state,
        profile: {
          ...profile,
        },
      };
    },
  ),
  // Optimistic `biteCount` updates for the signed-in user's own profile. The
  // aggregate is maintained by a Firestore trigger, and the client's copy of the
  // user document is read once at login and never again, so the profile header
  // kept showing the count from before the Bite the user had just posted — next
  // to a list that already showed it — until the app was restarted (issue
  // #1310). Both writes are the user's own, so the delta is exact, and the next
  // login reconciles it against the server aggregate either way.
  //
  // An account whose document carries no aggregate at all is left without one:
  // the profile falls back to counting the loaded Bites, and seeding a 1 here
  // would replace that full count with a partial one.
  on(BiteActions.createdBite, (state) => ({
    ...state,
    profile:
      state.profile && typeof state.profile.biteCount === 'number'
        ? { ...state.profile, biteCount: state.profile.biteCount + 1 }
        : state.profile,
  })),
  on(BiteActions.deletedBite, (state) => ({
    ...state,
    profile:
      state.profile && typeof state.profile.biteCount === 'number'
        ? {
            ...state.profile,
            biteCount: Math.max(state.profile.biteCount - 1, 0),
          }
        : state.profile,
  })),
  on(AppActions.loadedExchangeRatesFromAPI, (state, { exchangeRates }) => ({
    ...state,
    exchangeRates,
  })),
  on(AppActions.syncedEmailVerificationStatus, (state, { metadata }) => ({
    ...state,
    profile: state.profile
      ? {
          ...state.profile,
          ...metadata,
        }
      : state.profile,
  })),
  on(
    AppActions.loadedProfileMetadata,
    (state, { followers, following, isFollowedByMe }) => ({
      ...state,
      profileMetadata: {
        followers,
        following,
        isFollowedByMe,
      },
    }),
  ),
  // Optimistic follower-count updates for the viewed profile. The follow and
  // unfollow buttons only exist on the viewed profile, so the acting user is
  // always adjusting that profile's followers. Applying the delta here avoids
  // reading the `followersCount` aggregate before its Firestore trigger has
  // committed the change.
  on(AppActions.followedUser, (state) => ({
    ...state,
    profileMetadata: {
      ...state.profileMetadata,
      followers: state.profileMetadata.followers + 1,
      isFollowedByMe: true,
    },
  })),
  on(AppActions.unfollowedUser, (state) => ({
    ...state,
    profileMetadata: {
      ...state.profileMetadata,
      followers: Math.max(state.profileMetadata.followers - 1, 0),
      isFollowedByMe: false,
    },
  })),
  on(routerRequestAction, (state) => ({
    ...state,
    profileMetadata: { ...CLEAN_PROFILE_METADATA },
  })),
);
