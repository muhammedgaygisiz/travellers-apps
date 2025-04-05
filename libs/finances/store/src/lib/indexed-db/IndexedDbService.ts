import { Injectable } from '@angular/core';
import Dexie, { liveQuery, Table } from 'dexie';
import { Bank } from '../model/bank';
import { Account } from '../model/account';

const FINANCES_DB_NAME = 'ta-finances';

@Injectable({
  providedIn: 'root',
})
export class IndexedDbService extends Dexie {
  private readonly banks!: Table<Bank, string>;
  banks$ = liveQuery(() => this.banks.toArray());

  private readonly accounts!: Table<Account, string>;
  accounts$ = liveQuery(() => this.accounts.toArray());

  constructor() {
    super(FINANCES_DB_NAME);

    this.version(2).stores({
      banks: 'id',
      accounts: 'number',
    });
  }

  putAccounts(accounts: Account[]) {
    this.accounts.bulkPut(accounts);
  }
}
