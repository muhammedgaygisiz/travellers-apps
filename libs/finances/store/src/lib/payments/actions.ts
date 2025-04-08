import { createAction, props } from '@ngrx/store';
import { Payment } from '../utils/model/payment';

export const loadedPaymentsFromIndexedDb = createAction(
  '[PAYMENTS] Loaded from Indexed DB',
  props<{ payments: Payment[] }>()
);

export const loadedPaymentsFromFirestore = createAction(
  '[PAYMENTS] Loaded from Firestore',
  props<{ payments: Payment[] }>()
);
