import { createReducer, on } from '@ngrx/store';
import {
  loadedGpsPosition,
  loadedSettingsFromApi,
  setIsPublicProfile,
} from './actions';
import { AppSlice } from './app-slice.model';
import { loadedBitesFromApi } from '../bites/actions';
import { fromAuth } from 'ta-firestore';

const initialState = {
  isPublicProfile: false,
  settings: {
    pushNotifications: false,
    emailUpdates: false,
    theme: 'light',
    currency: 'EUR',
  },
  loading: {
    home: true,
  },
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
  on(loadedGpsPosition, (state, { position }) => {
    const { coords } = position;
    const { latitude, longitude } = coords;

    return {
      ...state,
      position: { latitude, longitude },
    };
  }),
  on(loadedSettingsFromApi, (state, { settings }) => {
    return {
      ...state,
      settings,
    };
  }),
  on(setIsPublicProfile, (state, { isPublic }) => {
    return {
      ...state,
      isPublicProfile: isPublic,
    };
  })
);
