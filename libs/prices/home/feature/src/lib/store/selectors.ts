import {createFeatureSelector, createSelector} from "@ngrx/store";
import {featureKey} from "./key";
import {adapter} from "./adapter";
import {State} from "./state";

const mostSearchedState = createFeatureSelector<State>(featureKey);

const {selectAll} = adapter.getSelectors();

export const selectAllItems = createSelector(
  mostSearchedState,
  selectAll,
);

