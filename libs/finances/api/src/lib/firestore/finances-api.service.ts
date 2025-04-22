import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, filter, switchMap } from 'rxjs';
import { Account } from './model/account';
import { Bank } from './model/bank';
import { Payment } from './model/payment';
import { AuthService } from 'ta-firestore';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';

const BANKS_COLLECTION = 'banks';
const ACCOUNTS_COLLECTION = 'accounts';
const PAYMENTS_COLLECTION = 'payments';

@Injectable({
  providedIn: 'root',
})
export class FinancesApiService {
  private readonly authService = inject(AuthService);

  private readonly paymentsChannel$ = new BehaviorSubject<Payment[]>([]);
  private readonly banksChannel$ = new BehaviorSubject<Bank[]>([]);
  private readonly accountsChannel$ = new BehaviorSubject<Account[]>([]);

  constructor() {
    FirebaseFirestore.addCollectionSnapshotListener(
      {
        reference: PAYMENTS_COLLECTION,
      },
      (docs) => {
        const payments = docs?.snapshots.map((doc: any) => doc.data) || [];
        this.paymentsChannel$.next(payments as unknown as Payment[]);
      }
    );

    FirebaseFirestore.addCollectionSnapshotListener(
      {
        reference: BANKS_COLLECTION,
      },
      (docs) => {
        const banks = docs?.snapshots.map((doc: any) => doc.data) || [];
        this.banksChannel$.next(banks as unknown as Bank[]);
      }
    );

    FirebaseFirestore.addCollectionSnapshotListener(
      {
        reference: ACCOUNTS_COLLECTION,
      },
      (docs) => {
        const accounts = docs?.snapshots.map((doc: any) => doc.data) || [];
        this.accountsChannel$.next(accounts as unknown as Account[]);
      }
    );
  }

  public allAccounts$ = this.authService.isLoggedIn$.pipe(
    filter((isLoggedIn) => isLoggedIn),
    switchMap(() => this.accountsChannel$)
  );

  public allBanks$ = this.authService.isLoggedIn$.pipe(
    filter((isLoggedIn) => isLoggedIn),
    switchMap(() => this.banksChannel$)
  );

  public allPayments$ = this.authService.isLoggedIn$.pipe(
    filter((isLoggedIn) => isLoggedIn),
    switchMap(() => this.paymentsChannel$)
  );

  // eslint-disable-next-line no-unused-vars
  saveNewBank(newBank: { name: string }) {
    // addDoc(this.banksCollection, { ...newBank, id: uuidV4() });
  }

  // eslint-disable-next-line no-unused-vars
  saveNewPayment(newPayment: { amount: number; iban: string }) {
    // addDoc(this.paymentsCollection, { ...newPayment, id: uuidV4() });
  }

  async savePayment(payment: any, id: string | undefined) {
    const querySnapshot = await FirebaseFirestore.getCollection({
      reference: PAYMENTS_COLLECTION,
      compositeFilter: {
        type: 'and',
        queryConstraints: [
          {
            type: 'where',
            fieldPath: 'id',
            opStr: '==',
            value: id,
          },
        ],
      },
    });

    if (querySnapshot.snapshots.length) {
      const docRef = querySnapshot.snapshots[0].path;

      const withConvertedDate = {
        ...payment,
        date: payment.date.toISOString(),
      };

      await FirebaseFirestore.updateDocument({
        reference: docRef,
        data: withConvertedDate,
      });

      return;
    }

    console.error('No payment found with the given ID:', id);
  }

  async loadPayment(id: any) {
    const querySnapshot = await FirebaseFirestore.getCollection({
      reference: PAYMENTS_COLLECTION,
      compositeFilter: {
        type: 'and',
        queryConstraints: [
          {
            type: 'where',
            fieldPath: 'id',
            opStr: '==',
            value: id,
          },
        ],
      },
    });

    if (querySnapshot.snapshots.length) {
      return querySnapshot.snapshots[0].data as Payment;
    }

    return undefined;
  }
}
