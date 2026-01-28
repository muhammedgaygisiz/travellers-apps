import { createReducer, on } from '@ngrx/store';
import { adapter, initialState } from './adapter';
import { UserActions } from './actions';

export const reducer = createReducer(
  initialState,
  on(UserActions.loadedBiteCreator, (state, { user }) =>
    adapter.upsertOne(user, state),
  ),
  on(
    UserActions.loadedFollowers,
    UserActions.loadedFollowings,
    (state, { users }) => {
      return adapter.upsertMany(users, state);
    },
  ),
  on(UserActions.loadedFollowers, (state, { users }) => ({
    ...state,
    followers: users,
  })),
  on(UserActions.loadedFollowings, (state, { users }) => ({
    ...state,
    followings: users,
  })),
);
