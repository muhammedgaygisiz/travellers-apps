import { createReducer, on } from '@ngrx/store';
import { adapter, initialState } from './adapter';
import { BucketlistActions } from './actions';
import { fromAuth } from 'ta-firestore';

export const reducer = createReducer(
  initialState,
  on(fromAuth.AuthActions.logoutSucceeded, (state) => adapter.removeAll(state)),
  on(BucketlistActions.loadedFromAPI, (state, { bucketlists }) =>
    adapter.upsertMany(bucketlists, initialState),
  ),
);
