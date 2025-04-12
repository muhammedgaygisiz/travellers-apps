import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PaymentComponent } from '../components/payment/payment.component';
import { PaymentService } from './payment.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <finances-payment (submitPayment)="service.saveNewPayment($event)" />
  `,
  imports: [PaymentComponent],
})
export class AddPaymentContainerComponent {
  service = inject(PaymentService);
}
