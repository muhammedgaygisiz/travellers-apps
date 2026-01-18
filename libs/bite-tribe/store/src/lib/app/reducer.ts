import { createReducer, on } from '@ngrx/store';
import { AppActions } from './actions';
import { AppSlice } from './app-slice.model';
import { BiteActions } from '../bites/actions';
import { fromAuth } from 'ta-firestore';

const initialState: AppSlice = {
  profile: undefined,
  followedBy: [],
  settings: {
    pushNotifications: false,
    emailUpdates: false,
    theme: 'light',
    currency: 'EUR',
    nearby: 2000,
  },
  loading: {
    home: true,
  },
  exchangeRates: { EUR: 1 },
  errorLoadingGpsPosition: false,
  totalNumberBites: 0,
  totalNumberUsers: 0,
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
        home: false,
      },
      errorLoadingGpsPosition: false,
    };
  }),
  on(AppActions.loadedSettingsFromAPI, (state, { settings }) => {
    return {
      ...state,
      settings,
    };
  }),
  on(
    AppActions.setPublicProfile,
    AppActions.savedPublicProfile,
    (state, { profile }) => {
      return {
        ...state,
        profile,
      };
    },
  ),
  on(AppActions.loadedExchangeRatesFromAPI, (state, { exchangeRates }) => ({
    ...state,
    exchangeRates,
  })),
  on(AppActions.loadedTotalNumberOfBites, (state, { total }) => ({
    ...state,
    totalNumberBites: total,
  })),
  on(AppActions.loadedTotalNumberOfUsers, (state, { total }) => ({
    ...state,
    totalNumberUsers: total,
  })),
);
