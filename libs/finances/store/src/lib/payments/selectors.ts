import { createFeatureSelector, createSelector } from '@ngrx/store';
import { key } from './key';
import { adapter } from './adapter';
import { EntityState } from '@ngrx/entity';
import { Payment } from '../utils/model/payment';

const slice = createFeatureSelector<EntityState<Payment>>(key);

const { selectAll } = adapter.getSelectors();

export const payments = createSelector(slice, selectAll);
