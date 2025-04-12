import { Payment } from './payment';

export type Account = {
  number: string;
  type: 'Bankkonto' | 'Tagesgeldkonto' | 'Kreditkarte' | 'Depot';
  balance: number;
  bank?: string;

  payments?: Payment[];
};
