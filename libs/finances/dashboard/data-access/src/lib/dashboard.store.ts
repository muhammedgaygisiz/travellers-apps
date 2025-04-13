import {
  patchState,
  signalStore,
  withHooks,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { Bank, FinancesStoreService } from 'finances/store';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, tap } from 'rxjs';
import { inject } from '@angular/core';

type DashboardState = {
  banks: Bank[];
};

const initialState: DashboardState = {
  banks: [],
};

export const DashboardStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withProps(() => ({
    _globalStore: inject(FinancesStoreService),
  })),
  withMethods((store) => ({
    loadBanks: rxMethod(
      pipe(
        tap((banks: Bank[]) => {
          patchState(store, { banks });
        })
      )
    ),
    getBanks() {
      return store.banks;
    },
  })),
  withHooks((store) => ({
    onInit() {
      store.loadBanks(store._globalStore.banks$);
    },
  }))
);
