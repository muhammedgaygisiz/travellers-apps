import { createReducer, on } from '@ngrx/store';
import { loadedGpsPosition, saveSettings } from './actions';

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
  on(saveSettings, (state, { settings }) => {
    return {
      ...state,
      settings,
    };
  })
);
