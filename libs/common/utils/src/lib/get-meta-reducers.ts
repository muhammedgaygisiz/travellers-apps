import { MetaReducer } from '@ngrx/store';
import { Environment } from './environment';

const metaReducers: MetaReducer[] = [];

export const getMetaReducers = (
  environment: Environment,
): MetaReducer[] | undefined => (!environment.production ? metaReducers : []);
