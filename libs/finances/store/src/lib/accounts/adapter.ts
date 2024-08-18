import { createEntityAdapter, EntityState } from '@ngrx/entity';
import { Account } from '../model/account';

export const adapter = createEntityAdapter<Account>();

export const initialState: EntityState<Account> = adapter.getInitialState({
  ids: [
    'DE1234567890',
    'DE9876543210',
    '45638729344545',
    '56780088',
    'CH1234567890',
  ],
  entities: {
    DE1234567890: {
      number: 'DE1234567890',
      type: 'Bankkonto',
      balance: 100,
      bank: '1',
    },
    DE9876543210: {
      number: 'DE9876543210',
      type: 'Tagesgeldkonto',
      balance: 50,
      bank: '1',
    },
    '45638729344545': {
      number: '45638729344545',
      type: 'Kreditkarte',
      balance: 150,
      bank: '1',
    },
    '56780088': {
      number: '56780088',
      type: 'Depot',
      balance: 200,
      bank: '1',
    },
    CH1234567890: {
      number: 'CH1234567890',
      type: 'Bankkonto',
      balance: 100,
      bank: '2',
    },
  },
});
