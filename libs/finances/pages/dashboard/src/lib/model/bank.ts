export interface Account {
  number: string;
  type: 'Bankkonto' | 'Tagesgeldkonto' | 'Kreditkarte' | 'Depot';
  balance: number;
}

export interface Bank {
  id: number;
  name: string;
  accounts: Account[];
}
