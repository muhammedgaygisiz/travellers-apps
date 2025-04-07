import { inject, Injectable } from '@angular/core';
import {
  Actions,
  createEffect,
  ofType,
  ROOT_EFFECTS_INIT,
} from '@ngrx/effects';
import { debounceTime, map, switchMap, tap } from 'rxjs';
import { IndexedDbService } from '../indexed-db/IndexedDbService';
import { loadedBanksFromFirestore } from './actions';
import { FinancesFirestoreService } from 'firestore';
import { Store } from '@ngrx/store';
import { banks } from './selectors';

@Injectable()
export class BanksEffect {
  private readonly actions$ = inject(Actions);
  private readonly indexedDbService = inject(IndexedDbService);
  private readonly financesFirestoreService = inject(FinancesFirestoreService);

  private readonly store = inject(Store);

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
        debounceTime(200),
        tap((banks) => {
          this.indexedDbService.putBanks(banks);
        })
      );
    },
    { dispatch: false }
  );
}
