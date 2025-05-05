import { createReducer, on } from '@ngrx/store';
import { adapter, initialState } from './adapter';
import { loadedReviewsFromApi } from './actions';

export const reducer = createReducer(
  initialState,
  on(loadedReviewsFromApi, (state, { reviews }) =>
    adapter.upsertMany(reviews, initialState)
  )
);
