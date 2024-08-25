import { createEntityAdapter, EntityState } from '@ngrx/entity';
import { Bank } from '../model/bank';

export const adapter = createEntityAdapter<Bank>();

export const initialState: EntityState<Bank> = adapter.getInitialState();
