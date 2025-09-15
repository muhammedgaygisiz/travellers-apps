import { Action, ActionReducer, MetaReducer } from '@ngrx/store';
import { Environment } from './environment';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const debug = (reducer: ActionReducer<any>): ActionReducer<any> => {
  return (state, action) => {
    // console.debug('state', state);
    // console.debug('action', action);

    return reducer(state, action);
  };
};

const metaReducers: MetaReducer[] = [];

export const getMetaReducers = (
  environment: Environment
): MetaReducer[] | undefined => (!environment.production ? metaReducers : []);
