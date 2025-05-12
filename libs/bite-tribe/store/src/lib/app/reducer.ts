import { createReducer, on } from '@ngrx/store';
import { loadedGpsPosition } from './actions';

export const reducer = createReducer<{ position?: any }>(
  {},
  on(loadedGpsPosition, (state, { position }) => {
    const { coords } = position;
    const { latitude, longitude } = coords;

    return {
      ...state,
      position: { latitude, longitude },
    };
  })
);
