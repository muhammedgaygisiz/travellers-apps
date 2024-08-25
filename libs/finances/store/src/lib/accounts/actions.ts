import { createAction, props } from '@ngrx/store';
import { Account } from '../model/account';

export const loadedAccountsFromIndexedDb = createAction(
  '[ACCOUNTS] Loaded from Indexed DB',
  props<{ accounts: Account[] }>()
);
