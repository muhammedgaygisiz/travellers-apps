import { createEntityAdapter, EntityState } from '@ngrx/entity';
import { Bite } from 'model';

export const adapter = createEntityAdapter<Bite>();

export const initialState: EntityState<any> = adapter.getInitialState();

export interface BiteState extends EntityState<Bite> {
  cachedBite?: Bite;
}
