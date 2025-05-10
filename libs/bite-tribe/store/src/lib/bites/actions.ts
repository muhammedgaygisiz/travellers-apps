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

export const saveLike = createAction(
  '[BITES] Save like',
  props<{
    createdAt: string;
    likeType: string;
    biteId: string;
  }>()
);

export const deletedLike = createAction(
  '[BITES] Deleted like',
  props<{
    like: {
      likeType: string;
      biteId: string;
      userId: string;
    };
  }>()
);

export const removeLike = createAction(
  '[BITES] Remove like',
  props<{ like: { likeType: string; biteId: string } }>()
);
