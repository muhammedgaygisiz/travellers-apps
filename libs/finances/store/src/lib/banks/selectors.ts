import { createFeatureSelector, createSelector } from '@ngrx/store';
import { key } from './key';
import { adapter } from './adapter';
import { EntityState } from '@ngrx/entity';
import { Bank } from '../utils/model/bank';
import { accountsWithPayments } from '../accounts/selectors';

const slice = createFeatureSelector<EntityState<Bank>>(key);

const { selectAll } = adapter.getSelectors();

export const banks = createSelector(slice, selectAll);

export const banksWithAccounts = createSelector(
  banks,
  accountsWithPayments,
  (banks, accounts) =>
    banks.map((bank) => ({
      ...bank,
      accounts: accounts
        .filter((account) => account.bank === bank.id)
        .map((account) => ({
          ...account,
          balance: account.payments
            .map((payment) => +payment.amount)
            .reduce((a, b) => a + b, 0),
        })),
    }))
);
