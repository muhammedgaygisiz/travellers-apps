import { Component, effect, input, output } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Payment } from '../../api/payment';
import { PageComponent } from 'common/ui/page';
import { CardComponent } from 'common/ui/card';
import {
  IonButton,
  IonCardHeader,
  IonCardSubtitle,
  IonInput,
  IonItem,
} from '@ionic/angular/standalone';

interface PaymentForm {
  amount: FormControl<number | null>;
}

@Component({
  selector: 'finances-payment',
  templateUrl: './payment.component.html',
  styleUrl: './payment.component.scss',
  imports: [
    PageComponent,
    CardComponent,
    IonCardHeader,
    IonCardSubtitle,
    ReactiveFormsModule,
    IonItem,
    IonInput,
    IonButton,
  ],
})
export class PaymentComponent {
  payment = input<Payment>();

  submitPayment = output<Payment>();

  paymentEffect = effect(() => {
    const payment = this.payment();

    this.paymentFormGroup.patchValue({ ...payment });
  });
  paymentFormGroup: FormGroup = new FormGroup<PaymentForm>({
    amount: new FormControl<number>(0, Validators.required),
  });
}
