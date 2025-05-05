import { createAction, props } from '@ngrx/store';

export const loadedReviewsFromApi = createAction(
  '[REVIEWS] Loaded from API',
  props<{ reviews: any }>()
);

export const saveNewReview = createAction(
  '[REVIEWS] Save new review',
  props<{ review: string; biteId: string }>()
);
