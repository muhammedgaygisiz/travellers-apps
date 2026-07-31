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
    }),
  ),
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
    };
  }),
  on(AppActions.errorLoadingGPSPosition, (state) => ({
    ...state,
    reloading: {
      home: false,
    },
    loading: {
      ...state.loading,
      home: false,
    },
    errorLoadingGpsPosition: true,
  })),
  on(AppActions.clearGPSError, (state) => ({
    ...state,
    errorLoadingGpsPosition: false,
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
    };
  }),
  on(AppActions.updatedGPSPositionWithoutReload, (state, { position }) => {
    const { latitude, longitude } = position.coords;

    // Keep the marker on the user's live position, but leave the bites (loaded
    // for the last meaningful position) untouched so no backend refetch runs.
    return {
      ...state,
      position: { latitude, longitude },
      reloading: {
        ...state.reloading,
        home: false,
      },
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
