import { createReducer, on } from '@ngrx/store';
import { adapter, initialState } from './adapter';
import { loadedBucketlistsFromApi } from './actions';

export const reducer = createReducer(
  initialState,
  on(loadedBucketlistsFromApi, (state, { bucketlists }) =>
    adapter.upsertMany(bucketlists, initialState)
  )
);
