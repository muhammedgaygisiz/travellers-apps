import { provideState, provideStore } from '@ngrx/store';
import { Environment, getMetaReducers } from 'utils';
import { fromMostSearched } from './mostSearched';
import { fromLocation } from './location';
import { fromNetworkStatus } from './networkStatus';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { provideEffects } from '@ngrx/effects';
import { NetworkEffects } from './networkStatus/effects';
import { MostSearchedItemsEffects } from './mostSearched/effects';
import { LocationEffects } from './location/effects';
import { LocalizationEffects } from './localization/effects';
import {
  AuthEffects,
  provideFirestoreState,
  provideFirestoreUtils,
} from 'ta-firestore';
import { provideNetworkStatus } from '@travellers-apps/common/networkstatus/feature';

const firebaseOptions = {
  apiKey: process.env['NX_APP_API_KEY'],
  authDomain: process.env['NX_APP_AUTH_DOMAIN'],
  projectId: process.env['NX_APP_PROJECT_ID'],
  storageBucket: process.env['NX_APP_STORAGE_BUCKET'],
  messagingSenderId: process.env['NX_APP_MESSAGINX_SENDER_ID'],
};

export const providePricesStore = (environment: Environment) => [
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
    LocalizationEffects,
  ]),
  provideFirestoreState(),
  provideState(fromMostSearched.key, fromMostSearched.reducer),
  provideState(fromLocation.key, fromLocation.reducer),
  provideState(fromNetworkStatus.key, fromNetworkStatus.reducer),
  !environment.production ? provideStoreDevtools({ connectInZone: true }) : [],
  provideFirestoreUtils(firebaseOptions),
  provideNetworkStatus(),
];
