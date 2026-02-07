import { createFeatureSelector, createSelector } from '@ngrx/store';
import { followType, userId } from '../router/selectors';
import { adapter } from './adapter';
import { creatorId } from '../bites/selectors';
import { key } from './key';
import { EntityState } from '@ngrx/entity';
import { PublicUser } from 'model';

const { selectAll } = adapter.getSelectors();

const slice = createFeatureSelector<EntityState<PublicUser>>(key);

const allUsers = createSelector(slice, selectAll);

export const userByUrlParam = createSelector(
  userId,
  allUsers,
  (userIdParam, users) => {
    if (!userIdParam) {
      return undefined;
    }
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
