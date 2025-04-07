import { Component, output } from '@angular/core';
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
  selector: 'finances-add-payment',
  templateUrl: './add-payment.component.html',
  styleUrl: './add-payment.component.scss',
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
export class AddPaymentComponent {
  submitNewPayment = output<Payment>();

  addPaymentFormGroup: FormGroup = new FormGroup<PaymentForm>({
    amount: new FormControl<number>(0, Validators.required),
  });
}
