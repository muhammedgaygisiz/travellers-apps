import { createReducer, on } from '@ngrx/store';
import { adapter, initialState } from './adapter';
import { BucketlistActions } from './actions';
import { fromAuth } from 'ta-firestore';
import { applyTriedOutStatus } from './utils/apply-tried-out-status';

export const reducer = createReducer(
  initialState,
  on(fromAuth.AuthActions.logoutSucceeded, (state) => adapter.removeAll(state)),
  on(BucketlistActions.loadedFromAPI, (state, { bucketlists }) =>
    adapter.upsertMany(bucketlists, initialState),
  ),
  // Tick the Bite off in the cached list right away, so the swipe answers on
  // the spot. The remote write follows through the effect, and the reload it
  // triggers reconciles the list with what Firestore actually stored.
  on(
    BucketlistActions.setBiteTriedOutStatus,
    (state, { bucketlistId, biteId, checked }) =>
      applyTriedOutStatus(state, { bucketlistId, biteId, checked }),
  ),
);
