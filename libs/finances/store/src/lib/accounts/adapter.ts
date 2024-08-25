import { createEntityAdapter, EntityState } from '@ngrx/entity';
import { Account } from '../model/account';

const selectId = (account: Account) => account.number;

export const adapter = createEntityAdapter<Account>({
  selectId,
});

export const initialState: EntityState<Account> = adapter.getInitialState();
