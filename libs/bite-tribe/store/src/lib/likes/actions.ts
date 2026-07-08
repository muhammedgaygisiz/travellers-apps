import { createAction, props } from '@ngrx/store';
import { Like, LikeType } from 'model';

export const loadedLikesFromApi = createAction(
  '[LIKES] Loaded from API',
  props<{ likes: Like[] }>(),
);

export const saveLike = createAction(
  '[BITES] Save like',
  props<{ like: Like; previousLikeType?: LikeType }>(),
);

export const saveLikeFailed = createAction(
  '[BITES] Save like failed',
  props<{ like: Like; previousLikeType?: LikeType }>(),
);

export const deletedLike = createAction(
  '[BITES] Deleted like',
  props<{ like: Like }>(),
);

export const removeLike = createAction(
  '[BITES] Remove like',
  props<{ like: Like }>(),
);

export const removeLikeFailed = createAction(
  '[BITES] Remove like failed',
  props<{ like: Like }>(),
);
