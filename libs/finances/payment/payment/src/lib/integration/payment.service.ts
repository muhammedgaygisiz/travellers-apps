import { inject, Injectable } from '@angular/core';
import { PaymentDataAccessService } from 'finances/payment/data-access';
import { Payment } from '../api/payment';
import { NavController } from '@ionic/angular';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  service = inject(PaymentDataAccessService);

  private readonly navController = inject(NavController);

  payment = this.service.payment;

  saveNewPayment(newPayment: Payment): void {
    this.service.saveNewPayment(newPayment);

    this.navController.back();
  }

  savePayment(payment: Payment): void {
    const currentPayment = this.payment();
    this.service.savePayment(payment, currentPayment?.id);

    this.navController.back();
  }
}
