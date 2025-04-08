import { inject, Injectable } from '@angular/core';
import {
  Actions,
  createEffect,
  ofType,
  ROOT_EFFECTS_INIT,
} from '@ngrx/effects';
import { IndexedDbService } from '../utils/indexed-db/IndexedDbService';
import { FinancesFirestoreService } from 'firestore';
import { map, switchMap, tap } from 'rxjs';
import { Store } from '@ngrx/store';
import { loadedPaymentsFromFirestore } from './actions';
import { payments } from './selectors';

@Injectable()
export class PaymentEffects {
  private readonly actions$ = inject(Actions);
  private readonly indexedDbService = inject(IndexedDbService);
  private readonly financesFirestoreService = inject(FinancesFirestoreService);

  private readonly store = inject(Store);

  getPaymentsFromFinancesStore$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ROOT_EFFECTS_INIT),
      switchMap(() => this.financesFirestoreService.allPayments$),
      map((payments) => loadedPaymentsFromFirestore({ payments }))
    );
  });

  savePaymentsToIndexedDb$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(ROOT_EFFECTS_INIT),
        switchMap(() => this.store.select(payments)),
        tap((payments) => {
          this.indexedDbService.putPayments(payments);
        })
      );
    },
    { dispatch: false }
  );
}
