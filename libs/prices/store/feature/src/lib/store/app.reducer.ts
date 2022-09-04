import {InjectionToken} from "@angular/core";
import {Action, ActionReducerMap} from "@ngrx/store";
import fromMostSearchedEntries from './slices/most-searched';

export interface State {
}

export const ROOT_REDUCERS = new InjectionToken<ActionReducerMap<State, Action>>(
  'Root reducers token',
  {
    factory: () => ({
      [fromMostSearchedEntries.MOST_SEARCHED_KEY]:  fromMostSearchedEntries.reducers
    })
  }
);

export const getMetaReducers = (environment: any) => !environment.production
  ? []
  : [];
