import { createEntityAdapter, EntityState } from '@ngrx/entity';
import type { Like } from 'model';

export const likeId = (like: Pick<Like, 'biteId' | 'userId'>): string =>
  `${like.biteId}-${like.userId}`;

export const adapter = createEntityAdapter<Like>({
  selectId: likeId,
});

export const initialState: EntityState<Like> = adapter.getInitialState();
