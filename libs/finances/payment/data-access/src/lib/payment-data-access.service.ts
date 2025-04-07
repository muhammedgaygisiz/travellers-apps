import { inject, Injectable } from '@angular/core';
import { FinancesFirestoreService } from 'firestore';
import { PaymentStore } from './payment.store';

@Injectable({ providedIn: 'root' })
export class PaymentDataAccessService {
  private readonly paymentStore = inject(PaymentStore);
  private readonly financesFirestoreService = inject(FinancesFirestoreService);

  iban = this.paymentStore.iban;

  saveNewPayment(newPayment: { amount: number; iban: string }) {
    this.financesFirestoreService.saveNewPayment(newPayment);
  }
}
