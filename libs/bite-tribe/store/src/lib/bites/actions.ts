import { createAction, props } from '@ngrx/store';

export const reloadBites = createAction('[BITES] Reload from API');

export const loadedBitesFromApi = createAction(
  '[BITES] Loaded from API',
  props<{ bites: any }>()
);

export const saveNewBite = createAction(
  '[BITES] Save new bite',
  props<{ bite: any }>()
);

export const saveExistingBite = createAction(
  '[BITES] Save existing bite',
  props<{ bite: any }>()
);

export const saveTags = createAction(
  '[BITES] Save new tags',
  props<{ newTags: string[]; id: string }>()
);

export const cacheBite = createAction(
  '[BITES] Cache bite',
  props<{ bite: any }>()
);

export const deleteBite = createAction(
  '[BITES] Delete bite',
  props<{ bite: any }>()
);

export const loadedBiteCreator = createAction(
  '[BITES] Loaded bite creator',
  props<{ biteCreator: any }>()
);

export const noPublicCreatorForBite = createAction(
  '[BITES] No public creator for bite'
);

export const stopReloadingBites = createAction('[BITES] Stop reloading bites');
