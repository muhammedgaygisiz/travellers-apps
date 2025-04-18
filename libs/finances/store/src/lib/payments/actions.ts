import { createAction, props } from '@ngrx/store';
import { Payment } from '../utils/model/payment';

export const savePayment = createAction(
  '[PAYMENTS] Update payment',
  props<{ payment: any; id: string }>()
);

export const saveNewPayment = createAction(
  '[PAYMENTS] Save new payment',
  props<{ payment: any }>()
);

export const updatedPayment = createAction(
  '[PAYMENTS] Updated payment',
  props<{ payment: any }>()
);

export const loadedPaymentsFromIndexedDb = createAction(
  '[PAYMENTS] Loaded from Indexed DB',
  props<{ payments: Payment[] }>()
);

export const loadedPaymentsFromFirestore = createAction(
  '[PAYMENTS] Loaded from Firestore',
  props<{ payments: Payment[] }>()
);
