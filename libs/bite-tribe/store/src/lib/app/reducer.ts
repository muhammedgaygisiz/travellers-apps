import { createReducer, on } from '@ngrx/store';
import { loadedGpsPosition, loadedSettingsFromApi } from './actions';

export const reducer = createReducer<{ position?: any }>(
  {},
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
  })
);
