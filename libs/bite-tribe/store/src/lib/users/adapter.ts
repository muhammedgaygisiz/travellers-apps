import { createEntityAdapter, EntityState } from '@ngrx/entity';
import { PublicUser } from 'model';

export interface UsersState extends EntityState<PublicUser> {
  followers: PublicUser[];
  followings: PublicUser[];
}

const selectId = (user: PublicUser): string => user.userId;

export const adapter = createEntityAdapter<PublicUser>({
  selectId,
});

export const initialState: UsersState = adapter.getInitialState({
  followers: [],
  followings: [],
});
