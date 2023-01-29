import { Action, ActionReducer, MetaReducer } from '@ngrx/store';
import { Environment } from './environment';

const debug = (reducer: ActionReducer<any>): ActionReducer<any> => {
  return (state, action) => {
    console.log('state', state);
    console.log('action', action);

    return reducer(state, action);
  };
};

const metaReducers: MetaReducer<any>[] = [debug];

export const getMetaReducers = (
  environment: Environment
  // eslint-disable-next-line @typescript-eslint/ban-types
): MetaReducer<{}, Action>[] | undefined =>
  !environment.production ? metaReducers : [];
