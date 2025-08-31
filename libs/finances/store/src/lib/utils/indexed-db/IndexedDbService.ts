import { Injectable } from '@angular/core';
import Dexie, { liveQuery, Table } from 'dexie';
import { Bank } from '../model/bank';
import { Account } from '../model/account';
import { Payment } from '../model/payment';

const FINANCES_DB_NAME = 'ta-finances';

@Injectable({
  providedIn: 'root',
})
export class IndexedDbService extends Dexie {
  private readonly banks!: Table<Bank, string>;
  banks$ = liveQuery(() => this.banks.toArray());

  private readonly accounts!: Table<Account, string>;
  accounts$ = liveQuery(() => this.accounts.toArray());

  private readonly payments!: Table<Payment, string>;
  payments$ = liveQuery(() => this.payments.toArray());

  constructor() {
    super(FINANCES_DB_NAME);

    this.version(3).stores({
      banks: 'id',
      accounts: 'number',
      payments: 'id',
    });

    this.version(2).stores({
      banks: 'id',
      accounts: 'number',
    });
  }

  putAccounts(accounts: Account[]): void {
    this.accounts.clear();
    this.accounts.bulkPut(accounts);
  }

  putBanks(banks: Bank[]): void {
    this.banks.clear();
    this.banks.bulkPut(banks);
  }

  putPayments(payments: Payment[]): void {
    this.payments.clear();
    this.payments.bulkPut(payments);
  }

  clearBanksInIndexedDb(): void {
    this.banks.clear();
  }

  clearAccountsInIndexedDb(): void {
    this.accounts.clear();
  }

  clearPaymentsInIndexedDb(): void {
    this.payments.clear();
  }
}
