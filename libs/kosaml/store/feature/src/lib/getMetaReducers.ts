// Developers can think of meta-reducers as hooks into the action->reducer pipeline.
// Meta-reducers allow developers to pre-process actions before normal reducers are invoked.
// see https://ngrx.io/guide/store/metareducers
import { Action, ActionReducer, MetaReducer } from '@ngrx/store';
import { Environment } from '@travellers-apps/utils-common';

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
