import { createReducer, on } from '@ngrx/store';
import {
  loadedGpsPosition,
  loadedSettingsFromApi,
  setIsPublicProfile,
} from './actions';
import { fromAuth } from 'ta-firestore';

export const reducer = createReducer<{
  position?: any;
}>(
  {},
  on(fromAuth.logoutSucceeded, () => ({})),
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
