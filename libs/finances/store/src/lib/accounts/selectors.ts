import { createFeatureSelector, createSelector } from '@ngrx/store';
import { key } from './key';
import { adapter } from '../accounts/adapter';
import { EntityState } from '@ngrx/entity';
import { Account } from '../utils/model/account';

const slice = createFeatureSelector<EntityState<Account>>(key);

const { selectAll } = adapter.getSelectors();

export const accounts = createSelector(slice, selectAll);
