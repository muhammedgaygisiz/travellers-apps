import { createReducer, on } from '@ngrx/store';
import { adapter, initialState } from './adapter';
import { loadedBucketlistsFromApi } from './actions';
import { fromAuth } from 'ta-firestore';

export const reducer = createReducer(
  initialState,
  on(fromAuth.logoutSucceeded, (state) => adapter.removeAll(state)),
  on(loadedBucketlistsFromApi, (state, { bucketlists }) =>
    adapter.upsertMany(bucketlists, initialState)
  )
);
