import { inject, Injectable } from '@angular/core';
import {
  Actions,
  createEffect,
  ofType,
  ROOT_EFFECTS_INIT,
} from '@ngrx/effects';
import { map, switchMap, tap } from 'rxjs';
import { IndexedDbService } from '../utils/indexed-db/IndexedDbService';
import { loadedAccountsFromFirestore } from './actions';
import { FinancesFirestoreService } from 'firestore';
import { Store } from '@ngrx/store';
import { accounts } from './selectors';

@Injectable()
export class AccountsEffect {
  private readonly actions$ = inject(Actions);
  private readonly indexedDbService = inject(IndexedDbService);
  private readonly financesFirestoreService = inject(FinancesFirestoreService);

  private readonly store = inject(Store);

  getAccountsFromFinancesFirestore$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ROOT_EFFECTS_INIT),
      switchMap(() => this.financesFirestoreService.allAccounts$),
      map((accounts) => loadedAccountsFromFirestore({ accounts }))
    );
  });

  saveAccountsToIndexedDb$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(ROOT_EFFECTS_INIT),
        switchMap(() => this.store.select(accounts)),
        tap((accounts) => this.indexedDbService.putAccounts(accounts))
      );
    },
    { dispatch: false }
  );
}
