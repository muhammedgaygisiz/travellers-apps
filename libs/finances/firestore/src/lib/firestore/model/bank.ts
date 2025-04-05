import { Account } from './account';

export type Bank = {
  id: string;
  name: string;
  accounts?: Account[];
};
