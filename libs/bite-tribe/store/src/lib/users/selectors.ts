import { createFeatureSelector, createSelector } from '@ngrx/store';
import { followType, userId } from '../router/selectors';
import { adapter, UsersState } from './adapter';
import { creatorId } from '../bites/selectors';
import { key } from './key';

const { selectAll } = adapter.getSelectors();

const slice = createFeatureSelector<UsersState>(key);

const allUsers = createSelector(slice, selectAll);

export const userByUrlParam = createSelector(
  userId,
  allUsers,
  (userIdParam, users) => {
    return users.find((user) => user.userId === userIdParam);
  },
);

export const userByUserIdInBite = createSelector(
  creatorId,
  allUsers,
  (creatorId, users) => {
    return users.find((user) => user.userId === creatorId);
  },
);

export const users = createSelector(
  slice,
  followType,
  (state, followersType) => {
    if (followersType === 'followers') {
      return state?.followers || [];
    }

    if (followersType === 'following') {
      return state?.followings || [];
    }

    return [];
  },
);
