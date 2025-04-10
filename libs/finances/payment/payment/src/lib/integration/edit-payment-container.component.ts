import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PaymentComponent } from '../components/payment/payment.component';
import { PaymentService } from './payment.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PaymentComponent],
  template: `
    <finances-payment
      [payment]="service.payment()"
      (submitPayment)="service.savePayment($event)"
    />
  `,
})
export class EditPaymentContainerComponent {
  service = inject(PaymentService);
}
