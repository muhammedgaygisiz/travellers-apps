import { createEntityAdapter, EntityState } from '@ngrx/entity';
import { Bank } from '../utils/model/bank';

export const adapter = createEntityAdapter<Bank>();

export const initialState: EntityState<Bank> = adapter.getInitialState();
