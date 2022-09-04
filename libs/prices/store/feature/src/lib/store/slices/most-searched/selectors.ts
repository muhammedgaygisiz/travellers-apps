import {createFeatureSelector, createSelector} from "@ngrx/store";
import {State} from "./state";
import {MOST_SEARCHED_KEY} from "./key";

const mostSearchedFeatureSlice = createFeatureSelector<State>(
  MOST_SEARCHED_KEY
);

export const mostSearchedState = createSelector(
  mostSearchedFeatureSlice,
  (state) => state
);
