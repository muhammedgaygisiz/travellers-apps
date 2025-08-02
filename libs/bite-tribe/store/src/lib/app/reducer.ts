import { createReducer, on } from '@ngrx/store';
import {
  errorLoadingGpsPosition,
  goPrivate,
  loadedGpsPosition,
  loadedSettingsFromApi,
  setPublicProfile,
  setHomeFilters,
  clearHomeFilters,
  loadedExchangeRatesFromApi,
  setHomeSorting,
} from './actions';
import { AppSlice } from './app-slice.model';
import { loadedBitesFromApi } from '../bites/actions';
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
  on(fromAuth.logoutSucceeded, () => initialState),
  on(loadedBitesFromApi, (state) => ({
    ...state,
    loading: {
      ...state.loading,
      home: false,
    },
  })),
  on(fromAuth.loginSucceeded, (state) => ({
    ...state,
    loading: {
      ...state.loading,
      home: true,
    },
  })),
  on(loadedGpsPosition, (state, { position }) => {
    const { coords } = position;
    const { latitude, longitude } = coords;

    return {
      ...state,
      position: { latitude, longitude },
    };
  }),
  on(errorLoadingGpsPosition, (state) => ({
    ...state,
    position: undefined,
  })),
  on(loadedSettingsFromApi, (state, { settings }) => {
    return {
      ...state,
      settings,
    };
  }),
  on(setPublicProfile, (state, { profile }) => {
    return {
      ...state,
      profile,
    };
  }),
  on(goPrivate, (state) => ({
    ...state,
    profile: undefined,
  })),
  on(setHomeFilters, (state, { filters }) => ({
    ...state,
    homeFilters: filters.tagFilters,
    maxPriceFilter: filters.priceFilter,
    homeDistance: +filters.distanceFilter,
  })),
  on(clearHomeFilters, (state) => ({
    ...state,
    homeFilters: [],
    maxPriceFilter: 0,
    distanceFilter: undefined,
  })),
  on(loadedExchangeRatesFromApi, (state, { exchangeRates }) => ({
    ...state,
    exchangeRates,
  })),
  on(setHomeSorting, (state, { sorting }) => ({
    ...state,
    homeSorting: sorting,
  }))
);
