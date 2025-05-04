import { createAction, props } from '@ngrx/store';

export const loadedBitesFromApi = createAction(
  '[BITES] Loaded from API',
  props<{ bites: any }>()
);

export const saveNewBite = createAction(
  '[BITES] Save new bite',
  props<{ bite: any }>()
);

export const saveTags = createAction(
  '[BITES] Save new tags',
  props<{ newTags: string[]; id: string }>()
);
