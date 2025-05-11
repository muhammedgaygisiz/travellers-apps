import { createAction, props } from '@ngrx/store';

export const loadedGpsPosition = createAction(
  '[APP] Loaded GPS position',
  props<{ position: any }>()
);
