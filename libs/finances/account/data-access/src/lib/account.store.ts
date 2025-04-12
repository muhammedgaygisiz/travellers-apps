import {
  patchState,
  signalStore,
  withHooks,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, tap } from 'rxjs';
import { Account, Payment, StoreService } from 'finances/store';
import { inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { getCurrentRouteParams } from 'data-access-utils';

type AccountState = {
  filter: string | undefined;
  account: Account | undefined;
  payments: Payment[];
};

const initialState: AccountState = {
  filter: '',
  account: undefined,
  payments: [],
};

export const AccountStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withProps(() => ({
    _globalStore: inject(StoreService),
    _activatedRoute: inject(ActivatedRoute),
  })),
  withMethods((store) => ({
    loadByQuery() {
      this.initializeStore();
    },
    setAccount: rxMethod(
      pipe(
        tap((accounts: Account[]) => {
          const iban = store.filter();
          const account = accounts.find((account) => account.number === iban);

          patchState(store, { account });
        })
      )
    ),
    setFilter: rxMethod(
      pipe(
        tap((params: any) => {
          const iban = params.get('iban');
          patchState(store, { filter: iban });
        })
      )
    ),
    setPaymentsForAccount: rxMethod(
      pipe(
        tap((payments: any[]) => {
          const account = store.account();
          if (account) {
            const paymentsForAccount = payments.filter(
              (payment) => payment.iban === account.number
            );

            patchState(store, {
              account: {
                ...account,
                balance: paymentsForAccount
                  .map((payment) => +payment.amount)
                  .reduce((a, b) => a + b, 0),
                payments: paymentsForAccount,
              },
            });
          }
        })
      )
    ),
    initializeStore() {
      const paramMap$ = getCurrentRouteParams(store._activatedRoute);
      this.setFilter(paramMap$);

      this.setAccount(store._globalStore.accounts$);

      this.setPaymentsForAccount(store._globalStore.payments$);
    },
  })),
  withHooks((store) => ({
    onInit() {
      store.initializeStore();
    },
  }))
);
