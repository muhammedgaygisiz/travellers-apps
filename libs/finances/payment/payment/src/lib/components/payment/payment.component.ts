import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
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
  IonDatetime,
  IonInput,
  IonItem,
  PopoverController,
} from '@ionic/angular/standalone';
import { toDateString } from './utils/to-date-string';
import { toDate } from './utils/to-date';

interface PaymentForm {
  amount: FormControl<number | null>;
  date: FormControl<string | null>;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  popoverController = inject(PopoverController);

  payment = input<Payment>();

  submitPayment = output<Payment>();

  paymentEffect = effect(() => {
    const payment = this.payment();

    this.paymentFormGroup.patchValue({
      ...payment,
      date: toDateString(payment?.date),
    });
  });

  paymentFormGroup: FormGroup = new FormGroup<PaymentForm>({
    amount: new FormControl<number>(0, Validators.required),
    date: new FormControl<string | null>(null, Validators.required),
  });

  popover: HTMLIonPopoverElement | undefined;

  async openDatePicker($event: MouseEvent): Promise<void> {
    const consecutiveClicks = $event.detail;
    const isSingleClick = consecutiveClicks === 1;

    if (isSingleClick) {
      this.popover = await this.popoverController.create({
        component: IonDatetime,
        componentProps: {
          handleIonChange: this.onIonChange.bind(this),
        },
        event: $event,
        dismissOnSelect: false,
      });

      await this.popover.present();
    }
  }

  onIonChange(event: { value: string }): void {
    this.popover?.dismiss();

    const date = new Date(event.value);

    this.paymentFormGroup.controls['date'].patchValue(toDateString(date));
  }

  onSubmitClick(): void {
    const payment = this.paymentFormGroup.value;

    this.submitPayment.emit({
      ...payment,
      date: toDate(payment.date),
    });
  }
}
