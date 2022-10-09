import { createFeatureSelector, createSelector } from '@ngrx/store';
import { key } from './key';
import { adapter } from './adapter';
import { State } from './state';

const mostSearchedState = createFeatureSelector<State>(key);

const { selectAll } = adapter.getSelectors();

export const selectAllItems = createSelector(mostSearchedState, selectAll);
