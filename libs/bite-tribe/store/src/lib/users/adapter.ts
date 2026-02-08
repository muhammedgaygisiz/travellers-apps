import { createEntityAdapter, EntityState } from '@ngrx/entity';
import { PublicUser } from 'model';

const selectId = (user: PublicUser): string => user.userId;

export const adapter = createEntityAdapter<PublicUser>({
  selectId,
});

export const initialState: EntityState<PublicUser> = adapter.getInitialState();
