import { provideState, provideStore } from '@ngrx/store';
import { getMetaReducers } from './getMetaReducers';
import { Environment } from '@travellers-apps/utils-common';
import { fromMostSearched } from './mostSearched';
import { fromAuth } from './auth';
import { fromLocation } from './location';
import { fromNetworkStatus } from './networkStatus';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { provideEffects } from '@ngrx/effects';
import { AuthEffects } from './auth/effects';
import { NetworkEffects } from './networkStatus/effects';
import { MostSearchedItemsEffects } from './mostSearched/effects';
import { LocationEffects } from './location/effects';

export const providePricesStoreFeatures = (environment: Environment) => [
  provideStore(
    {},
    {
      metaReducers: getMetaReducers(environment),
      runtimeChecks: {
        strictActionImmutability: true,
        strictStateImmutability: true,
      },
    }
  ),
  provideEffects([
    AuthEffects,
    NetworkEffects,
    MostSearchedItemsEffects,
    LocationEffects,
  ]),
  provideState(fromMostSearched.key, fromMostSearched.reducer),
  provideState(fromAuth.key, fromAuth.reducer),
  provideState(fromLocation.key, fromLocation.reducer),
  provideState(fromNetworkStatus.key, fromNetworkStatus.reducer),
  !environment.production ? provideStoreDevtools() : [],
  // TODO: We need to register the NetworkStatusService in root!
];
