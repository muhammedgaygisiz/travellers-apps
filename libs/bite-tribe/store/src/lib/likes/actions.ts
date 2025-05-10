import { createAction, props } from '@ngrx/store';

export const loadedLikesFromApi = createAction(
  '[LIKES] Loaded from API',
  props<{ likes: any }>()
);
