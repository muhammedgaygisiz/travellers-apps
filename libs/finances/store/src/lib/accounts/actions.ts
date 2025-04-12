import { createAction, props } from '@ngrx/store';
import { Account } from '../utils/model/account';

export const loadedAccountsFromIndexedDb = createAction(
  '[ACCOUNTS] Loaded from Indexed DB',
  props<{ accounts: Account[] }>()
);

export const loadedAccountsFromFirestore = createAction(
  '[ACCOUNTS] Loaded from Firestore',
  props<{ accounts: Account[] }>()
);
