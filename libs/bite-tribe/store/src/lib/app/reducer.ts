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
    pushNotifications: false,
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
  on(AppActions.clearReloadGPSPosition, (state) => ({
    ...state,
    reloading: {
      ...state.reloading,
      home: false,
    },
  })),
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
  on(AppActions.loadedProfileMetadata, (state, { type, ...metadata }) => ({
    ...state,
    profileMetadata: {
      ...metadata,
    },
  })),
  on(routerRequestAction, (state) => ({
    ...state,
    profileMetadata: { ...CLEAN_PROFILE_METADATA },
  })),
);
