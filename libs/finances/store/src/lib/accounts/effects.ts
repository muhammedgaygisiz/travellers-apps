import { inject, Injectable } from '@angular/core';
import {
  Actions,
  createEffect,
  ofType,
  ROOT_EFFECTS_INIT,
} from '@ngrx/effects';
import { map, switchMap } from 'rxjs';
import { IndexedDbService } from '../indexed-db/IndexedDbService';
import { loadedAccountsFromIndexedDb } from './actions';

@Injectable()
export class AccountsEffect {
  private readonly actions$ = inject(Actions);
  private readonly indexedDbService = inject(IndexedDbService);

  syncAccountsStore$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ROOT_EFFECTS_INIT),
      switchMap(() => this.indexedDbService.accounts$),
      map((accounts) => loadedAccountsFromIndexedDb({ accounts }))
    );
  });
}
