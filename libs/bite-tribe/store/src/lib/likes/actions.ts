import { createAction, props } from '@ngrx/store';
import { Like } from 'model';

export const loadedLikesFromApi = createAction(
  '[LIKES] Loaded from API',
  props<{ likes: Like[] }>(),
);

export const saveLike = createAction(
  '[BITES] Save like',
  props<{ like: Like }>(),
);

export const deletedLike = createAction(
  '[BITES] Deleted like',
  props<{ like: Like }>(),
);

export const removeLike = createAction(
  '[BITES] Remove like',
  props<{ like: Like }>(),
);
