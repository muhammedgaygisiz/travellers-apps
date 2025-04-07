import { inject, Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  collectionData,
  Firestore,
} from '@angular/fire/firestore';
import { debounceTime, filter, map, Observable, tap } from 'rxjs';
import { Account } from './model/account';
import { Bank } from './model/bank';
import { v4 as uuidV4 } from 'uuid';

const BANKS_COLLECTION = 'banks';
const ACCOUNTS_COLLECTION = 'accounts';
const PAYMENTS_COLLECTION = 'payments';

@Injectable({
  providedIn: 'root',
})
export class FinancesFirestoreService {
  private readonly afs = inject(Firestore);

  private banksCollection = collection(this.afs, BANKS_COLLECTION);
  private accountsCollection = collection(this.afs, ACCOUNTS_COLLECTION);
  private paymentsCollection = collection(this.afs, PAYMENTS_COLLECTION);

  public allAccounts$ = collectionData(this.accountsCollection) as Observable<
    Account[]
  >;

  public allBanks$ = (
    collectionData(this.banksCollection) as Observable<Bank[]>
  ).pipe(
    debounceTime(200),
    filter((banks) => banks.some((bank) => bank.id)),
    map((banks) =>
      banks.filter((res) => res.id).sort((a, b) => a.name.localeCompare(b.name))
    ),
    tap((banks) => console.log('Banks collection emitted:', banks)) // Add logging here
  );

  saveNewBank(newBank: { name: string }) {
    addDoc(this.banksCollection, { ...newBank, id: uuidV4() });
  }

  saveNewPayment(newPayment: { amount: number; iban: string }) {
    addDoc(this.paymentsCollection, { ...newPayment, id: uuidV4() });
  }
}
