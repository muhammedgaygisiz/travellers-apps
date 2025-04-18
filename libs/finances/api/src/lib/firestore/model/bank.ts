import { Account } from './account';

export interface Bank {
  id: string;
  name: string;
  accounts?: Account[];
}
