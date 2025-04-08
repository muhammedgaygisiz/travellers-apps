import { inject, Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  collectionData,
  Firestore,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Account } from './model/account';
import { Bank } from './model/bank';
import { v4 as uuidV4 } from 'uuid';
import { firebaseDebounceFilterAndLog } from './utils/firebase-debounce-filter-and-log';
import { Payment } from './model/payment';

const BANKS_COLLECTION = 'banks';
const ACCOUNTS_COLLECTION = 'accounts';
const PAYMENTS_COLLECTION = 'payments';

@Injectable({
  providedIn: 'root',
})
export class FinancesFirestoreService {
  private readonly afs = inject(Firestore);

  private readonly banksCollection = collection(this.afs, BANKS_COLLECTION);
  private readonly accountsCollection = collection(
    this.afs,
    ACCOUNTS_COLLECTION
  );
  private readonly paymentsCollection = collection(
    this.afs,
    PAYMENTS_COLLECTION
  );

  private readonly accountsChannel$ = collectionData(
    this.accountsCollection
  ) as Observable<Account[]>;

  private readonly banksChannel$ = collectionData(
    this.banksCollection
  ) as Observable<Bank[]>;

  private readonly paymentsChannel$ = collectionData(
    this.paymentsCollection
  ) as Observable<Payment[]>;

  public allAccounts$ = this.accountsChannel$.pipe(
    firebaseDebounceFilterAndLog<Account>('number')
  );

  public allBanks$ = this.banksChannel$.pipe(
    firebaseDebounceFilterAndLog<Bank>('id')
  );

  public allPayments$ = this.paymentsChannel$.pipe(
    firebaseDebounceFilterAndLog<Payment>('id')
  );

  saveNewBank(newBank: { name: string }) {
    addDoc(this.banksCollection, { ...newBank, id: uuidV4() });
  }

  saveNewPayment(newPayment: { amount: number; iban: string }) {
    addDoc(this.paymentsCollection, { ...newPayment, id: uuidV4() });
  }
}
