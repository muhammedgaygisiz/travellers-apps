import { Action, ActionReducer, MetaReducer } from '@ngrx/store';
import { Environment } from './environment';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const debug = (reducer: ActionReducer<any>): ActionReducer<any> => {
  return (state, action) => {
    console.log('state', state);
    console.log('action', action);

    return reducer(state, action);
  };
};

const metaReducers: MetaReducer[] = [debug];

export const getMetaReducers = (
  environment: Environment
  // eslint-disable-next-line @typescript-eslint/ban-types
): MetaReducer<{}, Action>[] | undefined =>
  !environment.production ? metaReducers : [];
