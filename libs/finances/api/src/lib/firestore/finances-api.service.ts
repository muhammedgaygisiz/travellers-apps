import { inject, Injectable } from '@angular/core';
import { filter, from, map, switchMap } from 'rxjs';
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

  private readonly accountsChannel$ = from(
    FirebaseFirestore.getCollection({
      reference: ACCOUNTS_COLLECTION,
    })
  );

  private readonly banksChannel$ = from(
    FirebaseFirestore.getCollection({
      reference: BANKS_COLLECTION,
    })
  );

  private readonly paymentsChannel$ = from(
    FirebaseFirestore.getCollection({
      reference: PAYMENTS_COLLECTION,
    })
  );

  public allAccounts$ = this.authService.isLoggedIn$.pipe(
    filter((isLoggedIn) => isLoggedIn),
    switchMap(() =>
      this.accountsChannel$.pipe(
        map(
          (res) =>
            res.snapshots.map(
              (snapshot) => snapshot.data
            ) as unknown as Account[]
        )
      )
    )
  );

  public allBanks$ = this.authService.isLoggedIn$.pipe(
    filter((isLoggedIn) => isLoggedIn),
    switchMap(() =>
      this.banksChannel$.pipe(
        map(
          (res) =>
            res.snapshots.map((snapshot) => snapshot.data) as unknown as Bank[]
        )
      )
    )
  );

  public allPayments$ = this.authService.isLoggedIn$.pipe(
    filter((isLoggedIn) => isLoggedIn),
    switchMap(() =>
      this.paymentsChannel$.pipe(
        map((res) => {
          return res.snapshots.map(
            (snapshot) => snapshot.data
          ) as unknown as Payment[];
        })
      )
    )
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
