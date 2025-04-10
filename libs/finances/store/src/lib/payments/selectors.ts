import { createFeatureSelector, createSelector } from '@ngrx/store';
import { key } from './key';
import { adapter } from './adapter';
import { EntityState } from '@ngrx/entity';
import { Payment } from '../utils/model/payment';
import { selectRouteParams } from '../router/selectors';

const slice = createFeatureSelector<EntityState<Payment>>(key);

const { selectAll } = adapter.getSelectors();

export const payments = createSelector(slice, selectAll);

export const selectedPayment = createSelector(
  payments,
  selectRouteParams,
  (payments, params) =>
    payments.find((payment) => payment.id === params?.['paymentId'])
);
