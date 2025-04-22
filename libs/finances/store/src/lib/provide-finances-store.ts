import { Environment, getMetaReducers } from 'utils';
import { provideState, provideStore } from '@ngrx/store';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { fromBank } from './banks';
import { fromAccount } from './accounts';
import { provideEffects } from '@ngrx/effects';
import { BanksEffect } from './banks/effects';
import { AccountsEffect } from './accounts/effects';
import { PaymentEffects } from './payments/effects';
import { fromPayments } from './payments';
import { provideRouterStore, routerReducer } from '@ngrx/router-store';
import {
  AuthEffects,
  provideFirestoreState,
  provideFirestoreUtils,
} from 'ta-firestore';

const firebaseOptions = {
  apiKey: process.env['NX_APP_API_KEY'],
  authDomain: process.env['NX_APP_AUTH_DOMAIN'],
  projectId: process.env['NX_APP_PROJECT_ID'],
  storageBucket: process.env['NX_APP_STORAGE_BUCKET'],
  messagingSenderId: process.env['NX_APP_MESSAGINX_SENDER_ID'],
};

export const provideFinancesStore = (environment: Environment) => [
  provideStore(
    { router: routerReducer },
    {
      metaReducers: getMetaReducers(environment),
      runtimeChecks: {
        strictActionImmutability: true,
        strictStateImmutability: true,
      },
    }
  ),
  provideEffects(BanksEffect, AccountsEffect, PaymentEffects, AuthEffects),
  provideRouterStore(),
  provideFirestoreState(),
  provideState(fromBank.key, fromBank.reducer),
  provideState(fromAccount.key, fromAccount.reducer),
  provideState(fromPayments.key, fromPayments.reducer),
  !environment.production ? provideStoreDevtools({ connectInZone: true }) : [],
  provideFirestoreUtils(firebaseOptions),
];
