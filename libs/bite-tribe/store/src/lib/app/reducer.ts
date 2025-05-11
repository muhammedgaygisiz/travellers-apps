import { createReducer, on } from '@ngrx/store';
import { loadedGpsPosition } from './actions';

export const reducer = createReducer<{ position?: any }>(
  {},
  on(loadedGpsPosition, (state, { position }) => {
    return {
      ...state,
      position: position.coords,
    };
  })
);
