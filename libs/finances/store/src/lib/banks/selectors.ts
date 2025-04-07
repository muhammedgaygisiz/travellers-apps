import { createFeatureSelector, createSelector } from '@ngrx/store';
import { key } from './key';
import { adapter } from './adapter';
import { EntityState } from '@ngrx/entity';
import { Bank } from '../model/bank';
import { accounts } from '../accounts/selectors';

const slice = createFeatureSelector<EntityState<Bank>>(key);

const { selectAll } = adapter.getSelectors();

export const banks = createSelector(slice, selectAll);

export const banksWithAccounts = createSelector(
  banks,
  accounts,
  (banks, accounts) =>
    banks.map((bank) => ({
      ...bank,
      accounts: accounts.filter((account) => account.bank === bank.id),
    }))
);
