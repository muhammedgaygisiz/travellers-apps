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
  homeFilters: [],
  homeSorting: 'distance',
  exchangeRates: { EUR: 1 },
  maxPriceFilter: 0,
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
  on(AppActions.loadedGPSPosition, (state, { position }) => {
    const { coords } = position;
    const { latitude, longitude } = coords;

    return {
      ...state,
      position: { latitude, longitude },
    };
  }),
  on(AppActions.errorLoadingGPSPosition, (state) => ({
    ...state,
    position: undefined,
  })),
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
  on(AppActions.setHomeFilters, (state, { filters }) => ({
    ...state,
    homeFilters: filters.tagFilters,
    maxPriceFilter: filters.priceFilter,
    homeDistance: +filters.distanceFilter,
  })),
  on(AppActions.clearHomeFilters, (state) => ({
    ...state,
    homeFilters: [],
    maxPriceFilter: 0,
    homeDistance: undefined,
  })),
  on(AppActions.loadedExchangeRatesFromAPI, (state, { exchangeRates }) => ({
    ...state,
    exchangeRates,
  })),
  on(AppActions.setHomeSorting, (state, { sorting }) => ({
    ...state,
    homeSorting: sorting,
  })),
);
