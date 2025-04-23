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
import { FinancesApiService } from 'finances/api';
import { Store } from '@ngrx/store';
import { accounts } from './selectors';
import { fromAuth } from 'ta-firestore';

@Injectable()
export class AccountsEffect {
  private readonly actions$ = inject(Actions);
  private readonly indexedDbService = inject(IndexedDbService);
  private readonly financesFirestoreService = inject(FinancesApiService);
  private readonly store = inject(Store);

  logoutEffect$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(fromAuth.logoutSucceeded),
        tap(async () => {
          this.indexedDbService.clearAccountsInIndexedDb();
          await this.financesFirestoreService.stopAccountsListener();
        })
      ),
    { dispatch: false }
  );

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
