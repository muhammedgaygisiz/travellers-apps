import { createAction, props } from '@ngrx/store';

export const locationLoaded = createAction(
  '[Geoapify API] Loaded location',
  props<{ location: string }>()
);
