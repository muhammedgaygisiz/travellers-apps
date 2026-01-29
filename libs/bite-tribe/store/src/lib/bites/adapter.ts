import { createEntityAdapter, EntityState } from '@ngrx/entity';
import type { Bite } from 'model';

export interface BitesState extends EntityState<Bite> {
  cachedBite?: Partial<Bite>;
  editingBite?: Partial<Bite>;
  latestBites: Bite[];
}

export const adapter = createEntityAdapter<Bite>();

export const initialState: BitesState = adapter.getInitialState({
  latestBites: [],
});
