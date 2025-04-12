import { createEntityAdapter, EntityState } from '@ngrx/entity';
import { Payment } from '../utils/model/payment';

export const adapter = createEntityAdapter<Payment>();

export const initialState: EntityState<Payment> = adapter.getInitialState();
