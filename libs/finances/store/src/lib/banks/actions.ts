import { createAction, props } from '@ngrx/store';
import { Bank } from '../model/bank';

export const loadedBanksFromIndexedDb = createAction(
  '[BANKS] Loaded from Indexed DB',
  props<{ banks: Bank[] }>()
);
