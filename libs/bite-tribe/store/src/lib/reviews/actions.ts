import { createAction, props } from '@ngrx/store';
import type { Review } from 'model';

export const loadedReviewsFromApi = createAction(
  '[REVIEWS] Loaded from API',
  props<{ reviews: Review[] }>(),
);

export const saveNewReview = createAction(
  '[REVIEWS] Save new review',
  props<{ review: string; biteId: string }>(),
);

export const saveReviewReply = createAction(
  '[REVIEWS] Save review reply',
  props<{
    review: string;
    biteId: string;
    parentReviewId: string;
    threadId: string;
  }>(),
);
