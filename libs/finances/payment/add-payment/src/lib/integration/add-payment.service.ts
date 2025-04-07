import { inject, Injectable } from '@angular/core';
import { PaymentDataAccessService } from 'finances/payment/data-access';
import { Payment } from '../api/payment';
import { NavController } from '@ionic/angular';

@Injectable({ providedIn: 'root' })
export class AddPaymentService {
  private paymentDataAccessService = inject(PaymentDataAccessService);
  private readonly navController = inject(NavController);

  saveNewPayment(newPayment: Payment) {
    const iban = this.paymentDataAccessService.iban();
    this.paymentDataAccessService.saveNewPayment({ ...newPayment, iban });

    this.navController.back();
  }
}
