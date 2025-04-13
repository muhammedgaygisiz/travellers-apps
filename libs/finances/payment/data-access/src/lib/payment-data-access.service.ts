import { inject, Injectable } from '@angular/core';
import { FinancesFirestoreService } from 'firestore';
import { toSignal } from '@angular/core/rxjs-interop';
import { FinancesStoreService } from 'finances/store';

@Injectable({ providedIn: 'root' })
export class PaymentDataAccessService {
  private readonly financesFirestoreService = inject(FinancesFirestoreService);
  private readonly storeService = inject(FinancesStoreService);

  payment = toSignal(this.storeService.selectedPayment$);
  iban = toSignal(this.storeService.iban$);

  saveNewPayment(newPayment: { amount: number }) {
    const iban = this.iban();
    this.financesFirestoreService.saveNewPayment({ ...newPayment, iban });
  }

  savePayment(payment: any, id: string | undefined) {
    this.financesFirestoreService.savePayment(payment, id);
  }
}
