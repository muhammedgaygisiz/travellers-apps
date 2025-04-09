import { createFeatureSelector, createSelector } from '@ngrx/store';
import { key } from './key';
import { adapter } from '../accounts/adapter';
import { EntityState } from '@ngrx/entity';
import { Account } from '../utils/model/account';
import { payments } from '../payments/selectors';
import { Payment } from '../utils/model/payment';

const slice = createFeatureSelector<EntityState<Account>>(key);

const { selectAll } = adapter.getSelectors();

export const accounts = createSelector(slice, selectAll);

export const accountsWithPayments = createSelector(
  accounts,
  payments,
  (accounts, payments) =>
    accounts.map((account) => ({
      ...account,
      payments: payments.filter(
        (payment: Payment) => payment.iban === account.number
      ),
    }))
);
