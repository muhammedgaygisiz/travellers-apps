import { Environment, getMetaReducers } from '@travellers-apps/utils-common';
import { provideState, provideStore } from '@ngrx/store';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { fromBank } from './banks';
import { fromAccount } from './accounts';

export const provideFinancesStore = (environment: Environment) => [
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
  provideState(fromBank.key, fromBank.reducer),
  provideState(fromAccount.key, fromAccount.reducer),
  !environment.production ? provideStoreDevtools({ connectInZone: true }) : [],
];
