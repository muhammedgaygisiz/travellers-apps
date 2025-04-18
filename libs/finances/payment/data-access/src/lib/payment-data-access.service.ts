import { inject, Injectable } from '@angular/core';

import { toSignal } from '@angular/core/rxjs-interop';
import { FinancesStoreService } from 'finances/store';

@Injectable({ providedIn: 'root' })
export class PaymentDataAccessService {
  private readonly storeService = inject(FinancesStoreService);

  payment = toSignal(this.storeService.selectedPayment$);
  iban = toSignal(this.storeService.iban$);

  saveNewPayment(newPayment: { amount: number }) {
    const iban = this.iban();
    this.storeService.saveNewPayment({ ...newPayment, iban });
  }

  async savePayment(payment: any, id: string | undefined) {
    await this.storeService.savePayment(payment, id);

    this.storeService;
  }
}
