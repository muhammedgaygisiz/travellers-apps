import { createAction, props } from '@ngrx/store';

export const loadedLikesFromApi = createAction(
  '[LIKES] Loaded from API',
  props<{ likes: any }>()
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
