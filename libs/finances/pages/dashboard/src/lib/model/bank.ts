export type Account = {
  number: string;
  type: 'Bankkonto' | 'Tagesgeldkonto' | 'Kreditkarte' | 'Depot';
  balance: number;
};

export type Bank = {
  id: number;
  name: string;
  accounts: Account[];
};
