import { createReducer, on } from '@ngrx/store';
import { AppActions } from './actions';
import { AppSlice } from './app-slice.model';
import { BiteActions } from '../bites/actions';
import { fromAuth } from 'ta-firestore';

const initialState: AppSlice = {
  profile: undefined,
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
};

export const reducer = createReducer<AppSlice>(
  initialState,
  on(fromAuth.AuthActions.logoutSucceeded, () => initialState),
  on(BiteActions.loadedFromAPI, (state) => ({
    ...state,
    loading: {
      ...state.loading,
      home: false,
    },
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
    };
  }),
  on(AppActions.errorLoadingGPSPosition, (state) => ({
    ...state,
    reloading: {
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
  on(AppActions.setPublicProfile, (state, { profile }) => {
    return {
      ...state,
      profile,
    };
  }),
  on(AppActions.goPrivate, (state) => ({
    ...state,
    profile: undefined,
  })),
  on(AppActions.loadedExchangeRatesFromAPI, (state, { exchangeRates }) => ({
    ...state,
    exchangeRates,
  })),
);
