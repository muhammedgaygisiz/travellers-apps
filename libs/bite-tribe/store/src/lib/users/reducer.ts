import { createReducer, on } from '@ngrx/store';
import { adapter, initialState } from './adapter';
import { UserActions } from './actions';

export const reducer = createReducer(
  initialState,
  on(UserActions.loadedBiteCreator, (state, { user }) =>
    adapter.upsertOne(user, state),
  ),
);
