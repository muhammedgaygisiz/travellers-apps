import { inject, Injectable } from '@angular/core';
import {
  Actions,
  createEffect,
  ofType,
  ROOT_EFFECTS_INIT,
} from '@ngrx/effects';
import { map, switchMap, tap } from 'rxjs';
import { IndexedDbService } from '../utils/indexed-db/IndexedDbService';
import { loadedBanksFromFirestore } from './actions';
import { FinancesApiService } from 'finances/api';
import { Store } from '@ngrx/store';
import { banks } from './selectors';
import { fromAuth } from 'ta-firestore';

@Injectable()
export class BanksEffect {
  private readonly actions$ = inject(Actions);
  private readonly indexedDbService = inject(IndexedDbService);
  private readonly financesFirestoreService = inject(FinancesApiService);

  private readonly store = inject(Store);

  logoutEffect$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(fromAuth.logoutSucceeded),
        tap(async () => {
          this.indexedDbService.clearBanksInIndexedDb();
          await this.financesFirestoreService.stopBanksListener();
        })
      ),
    { dispatch: false }
  );

  getBanksFromFinancesStore$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ROOT_EFFECTS_INIT),
      switchMap(() => this.financesFirestoreService.allBanks$),
      map((banks) => loadedBanksFromFirestore({ banks }))
    );
  });

  saveBanksToIndexedDb$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(ROOT_EFFECTS_INIT),
        switchMap(() => this.store.select(banks)),
        tap((banks) => {
          this.indexedDbService.putBanks(banks);
        })
      );
    },
    { dispatch: false }
  );
}
