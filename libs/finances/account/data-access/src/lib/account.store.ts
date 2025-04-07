import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, tap } from 'rxjs';
import { Account, StoreService } from 'finances/store';
import { computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { getCurrentRouteParams } from 'data-access-utils';

type AccountState = {
  filter: string | undefined;
  accounts: Account[];
};

const initialState: AccountState = {
  filter: '',
  accounts: [],
};

export const AccountStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withProps(() => ({
    _globalStore: inject(StoreService),
    _activatedRoute: inject(ActivatedRoute),
  })),
  withComputed(({ filter, accounts }) => ({
    selectedAccount: computed(() => {
      const iban = filter();

      return accounts().find((account) => account.number === iban);
    }),
  })),
  withMethods((store) => ({
    loadAccounts: rxMethod(
      pipe(
        tap((accounts: Account[]) => {
          patchState(store, { accounts });
        })
      )
    ),
    setSelectedAccount: rxMethod(
      pipe(
        tap((params: any) => {
          const iban = params.get('iban');
          patchState(store, { filter: iban });
        })
      )
    ),
  })),
  withHooks((store) => ({
    onInit() {
      store.loadAccounts(store._globalStore.accounts$);

      const paramMap$ = getCurrentRouteParams(store._activatedRoute);
      store.setSelectedAccount(paramMap$);
    },
  }))
);
