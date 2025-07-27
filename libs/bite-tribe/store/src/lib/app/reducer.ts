import { createReducer, on } from '@ngrx/store';
import {
  errorLoadingGpsPosition,
  goPrivate,
  loadedGpsPosition,
  loadedSettingsFromApi,
  setPublicProfile,
  setHomeFilters,
  clearHomeFilters,
  setHomeNearbyFilter,
  clearHomeNearbyFilter,
} from './actions';
import { AppSlice } from './app-slice.model';
import { loadedBitesFromApi } from '../bites/actions';
import { fromAuth } from 'ta-firestore';

const initialState = {
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
} as AppSlice;

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
    homeFilters: filters,
  })),
  on(clearHomeFilters, (state) => ({
    ...state,
    homeFilters: [],
  })),
  on(setHomeNearbyFilter, (state, { distance }) => ({
    ...state,
    homeDistance: distance,
  })),
  on(clearHomeNearbyFilter, (state) => ({
    ...state,
    homeDistance: undefined,
  }))
);
