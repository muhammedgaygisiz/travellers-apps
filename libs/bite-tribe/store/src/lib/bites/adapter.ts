import { createEntityAdapter, EntityState } from '@ngrx/entity';
import { Bite } from 'model';

export const adapter = createEntityAdapter<Bite>();

export const initialState: EntityState<any> = adapter.getInitialState();
