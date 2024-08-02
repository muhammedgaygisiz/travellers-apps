import { Bank } from '../model/bank';

export const BANKS: Bank[] = [
  {
    id: 1,
    name: 'ING',
    accounts: [
      {
        number: 'DE1234567890',
        type: 'Bankkonto',
        balance: 100,
      },
      {
        number: 'DE9876543210',
        type: 'Tagesgeldkonto',
        balance: 50,
      },
      {
        number: '45638729344545',
        type: 'Kreditkarte',
        balance: 150,
      },
      {
        number: '56780088',
        type: 'Depot',
        balance: 200,
      },
    ],
  },
  {
    id: 2,
    name: 'Postfinance',
    accounts: [
      {
        number: 'CH1234567890',
        type: 'Bankkonto',
        balance: 100,
      },
    ],
  },
];
