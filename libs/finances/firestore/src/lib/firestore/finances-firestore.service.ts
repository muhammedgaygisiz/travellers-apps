import { inject, Injectable } from '@angular/core';
import { collection, collectionData, Firestore } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Account } from './model/account';
import { Bank } from './model/bank';

const BANKS_COLLECTION = 'banks';
const ACCOUNTS_COLLECTION = 'accounts';

@Injectable({
  providedIn: 'root',
})
export class FinancesFirestoreService {
  private readonly afs = inject(Firestore);

  private banksCollection = collection(this.afs, BANKS_COLLECTION);
  private accountsCollection = collection(this.afs, ACCOUNTS_COLLECTION);

  public allAccounts$ = collectionData(this.accountsCollection) as Observable<
    Account[]
  >;

  public allBanks$ = collectionData(this.banksCollection) as Observable<Bank[]>;
}
