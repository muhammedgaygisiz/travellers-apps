import {
  patchState,
  signalStore,
  withHooks,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { pipe, tap } from 'rxjs';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { getCurrentRouteParams } from 'data-access-utils';

const initialState = {
  iban: '',
};
export const PaymentStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withProps(() => ({
    _activatedRoute: inject(ActivatedRoute),
  })),
  withMethods((store) => ({
    setIban: rxMethod(
      pipe(
        tap((params: any) => {
          const iban = params.get('iban');
          patchState(store, { iban });
        })
      )
    ),
  })),
  withHooks((store) => ({
    onInit() {
      const paramMap$ = getCurrentRouteParams(store._activatedRoute);
      store.setIban(paramMap$);
    },
  }))
);
