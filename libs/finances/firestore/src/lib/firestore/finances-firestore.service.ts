import { inject, Injectable } from '@angular/core';
import { collection, collectionData, Firestore } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Account } from './account';

const ACCOUNTS_COLLECTION = 'accounts';

@Injectable({
  providedIn: 'root',
})
export class FinancesFirestoreService {
  private readonly afs = inject(Firestore);
  private accountsCollection = collection(this.afs, ACCOUNTS_COLLECTION);

  public allAccounts$ = collectionData(this.accountsCollection) as Observable<
    Account[]
  >;
}
