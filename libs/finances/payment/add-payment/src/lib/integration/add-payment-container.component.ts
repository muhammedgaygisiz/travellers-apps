import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AddPaymentComponent } from '../components/add-payment/add-payment.component';
import { AddPaymentService } from './add-payment.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <finances-add-payment (submitNewPayment)="service.saveNewPayment($event)" />
    <!--[payments]="service.payments()"-->
  `,
  imports: [AddPaymentComponent],
})
export class AddPaymentContainerComponent {
  service = inject(AddPaymentService);
}
