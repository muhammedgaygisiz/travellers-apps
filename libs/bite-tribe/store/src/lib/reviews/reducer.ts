import { createReducer, on } from '@ngrx/store';
import { adapter, initialState } from './adapter';
import { loadedReviewsFromApi } from './actions';
import { fromAuth } from 'ta-firestore';

export const reducer = createReducer(
  initialState,
  on(fromAuth.logoutSucceeded, (state) => adapter.removeAll(state)),
  on(loadedReviewsFromApi, (state, { reviews }) =>
    adapter.upsertMany(reviews, initialState)
  )
);
