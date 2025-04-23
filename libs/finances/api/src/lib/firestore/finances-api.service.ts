import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, debounceTime, filter, switchMap } from 'rxjs';
import { Account } from './model/account';
import { Bank } from './model/bank';
import { Payment } from './model/payment';
import { AuthService } from 'ta-firestore';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { v4 as uuidV4 } from 'uuid';

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

  public allAccounts$ = this.authService.isLoggedIn$.pipe(
    filter((isLoggedIn) => isLoggedIn),
    debounceTime(500),
    switchMap(() => {
      this.startAccountListener();

      return this.accountsChannel$;
    })
  );

  public allBanks$ = this.authService.isLoggedIn$.pipe(
    filter((isLoggedIn) => isLoggedIn),
    debounceTime(500),
    switchMap(() => {
      this.startBanksListener();

      return this.banksChannel$;
    })
  );

  public allPayments$ = this.authService.isLoggedIn$.pipe(
    filter((isLoggedIn) => isLoggedIn),
    debounceTime(500),
    switchMap(() => {
      this.startPaymentsListener();

      return this.paymentsChannel$;
    })
  );

  private banksCallbackId = '';
  private accountsCallbackId = '';
  private paymentsCallbackId = '';

  // eslint-disable-next-line no-unused-vars
  saveNewBank(newBank: { name: string }) {
    // addDoc(this.banksCollection, { ...newBank, id: uuidV4() });
  }

  saveNewPayment(newPayment: { amount: number; iban: string }) {
    FirebaseFirestore.addDocument({
      reference: PAYMENTS_COLLECTION,
      data: {
        ...newPayment,
        id: uuidV4(),
      },
    });
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

      await FirebaseFirestore.updateDocument({
        reference: docRef,
        data: payment,
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

  private async startPaymentsListener() {
    console.log('#mo Fetching payments from Firestore');

    this.paymentsCallbackId =
      await FirebaseFirestore.addCollectionSnapshotListener(
        {
          reference: PAYMENTS_COLLECTION,
        },
        (docs) => {
          console.log('#mo Fetched payments from Firestore', docs);

          const payments = docs?.snapshots.map((doc: any) => doc.data) || [];
          this.paymentsChannel$.next(payments as unknown as Payment[]);
        }
      );
  }

  private async startBanksListener() {
    console.log('#mo Fetching banks from Firestore');

    this.banksCallbackId =
      await FirebaseFirestore.addCollectionSnapshotListener(
        {
          reference: BANKS_COLLECTION,
        },
        (docs) => {
          console.log('#mo Fetched banks from Firestore', docs);

          const banks = docs?.snapshots.map((doc: any) => doc.data) || [];
          this.banksChannel$.next(banks as unknown as Bank[]);
        }
      );
  }

  private async startAccountListener() {
    console.log('#mo Fetching accounts from Firestore');

    this.accountsCallbackId =
      await FirebaseFirestore.addCollectionSnapshotListener(
        {
          reference: ACCOUNTS_COLLECTION,
        },
        (docs) => {
          console.log('#mo Fetched accounts from Firestore', docs);

          const accounts = docs?.snapshots.map((doc: any) => doc.data) || [];
          this.accountsChannel$.next(accounts as unknown as Account[]);
        }
      );
  }

  async stopBanksListener() {
    await FirebaseFirestore.removeSnapshotListener({
      callbackId: this.banksCallbackId,
    });
  }

  async stopAccountsListener() {
    await FirebaseFirestore.removeSnapshotListener({
      callbackId: this.accountsCallbackId,
    });
  }

  async stopPaymentsListener() {
    await FirebaseFirestore.removeSnapshotListener({
      callbackId: this.paymentsCallbackId,
    });
  }
}
