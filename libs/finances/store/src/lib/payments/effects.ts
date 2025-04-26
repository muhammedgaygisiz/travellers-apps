import { inject, Injectable } from '@angular/core';
import {
  Actions,
  createEffect,
  ofType,
  ROOT_EFFECTS_INIT,
} from '@ngrx/effects';
import { IndexedDbService } from '../utils/indexed-db/IndexedDbService';
import { FinancesApiService } from 'finances/api';
import { from, map, switchMap, tap } from 'rxjs';
import { Store } from '@ngrx/store';
import {
  loadedPaymentsFromFirestore,
  saveNewPayment,
  savePayment,
  updatedPayment,
} from './actions';
import { payments } from './selectors';
import { fromAuth } from 'ta-firestore';

@Injectable()
export class PaymentEffects {
  private readonly actions$ = inject(Actions);
  private readonly indexedDbService = inject(IndexedDbService);
  private readonly api = inject(FinancesApiService);

  private readonly store = inject(Store);

  logoutEffect$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(fromAuth.logoutSucceeded),
        tap(async () => {
          this.indexedDbService.clearPaymentsInIndexedDb();
          await this.api.stopPaymentsListener();
        })
      ),
    { dispatch: false }
  );

  getPaymentsFromFinancesStore$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ROOT_EFFECTS_INIT),
      switchMap(() => this.api.allPayments$),
      map((payments) => loadedPaymentsFromFirestore({ payments }))
    );
  });

  savePaymentsToIndexedDb$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(ROOT_EFFECTS_INIT),
        switchMap(() => this.store.select(payments)),
        tap((payments) => {
          console.log('PAYMENTS from store -> idb', payments);
          this.indexedDbService.putPayments(payments);
        })
      );
    },
    { dispatch: false }
  );

  saveNewPaymentToFirestore$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(saveNewPayment),
        tap(({ payment }) => {
          this.api.saveNewPayment(payment);
        })
      );
    },
    { dispatch: false }
  );

  savePaymentToFirestore$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(savePayment),
      switchMap(({ payment, id }) => {
        return from(this.api.savePayment(payment, id)).pipe(
          switchMap(() => this.api.loadPayment(id)),
          map((payment) => {
            return updatedPayment({ payment });
          })
        );
      })
    );
  });
}
