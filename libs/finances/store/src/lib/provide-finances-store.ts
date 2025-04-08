import { Environment, getMetaReducers } from '@travellers-apps/utils-common';
import { provideState, provideStore } from '@ngrx/store';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { fromBank } from './banks';
import { fromAccount } from './accounts';
import { provideEffects } from '@ngrx/effects';
import { BanksEffect } from './banks/effects';
import { AccountsEffect } from './accounts/effects';
import { PaymentEffects } from './payments/effects';
import { fromPayments } from './payments';

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
  provideEffects(BanksEffect, AccountsEffect, PaymentEffects),
  provideState(fromBank.key, fromBank.reducer),
  provideState(fromAccount.key, fromAccount.reducer),
  provideState(fromPayments.key, fromPayments.reducer),
  !environment.production ? provideStoreDevtools({ connectInZone: true }) : [],
];
