import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import {
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonItem,
  IonItemGroup,
  IonLabel,
  IonNote,
} from '@ionic/angular/standalone';
import { Bank } from 'finances/dashboard/data-access';
import { CardComponent } from 'common/ui/card';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'finances-bank',
  templateUrl: './bank.component.html',
  imports: [
    IonItem,
    IonItemGroup,
    IonLabel,
    IonNote,
    CardComponent,
    IonCardHeader,
    IonCardSubtitle,
    IonCardContent,
    IonCardTitle,
  ],
})
export class BankComponent {
  bank = input.required<Bank>();

  openAccountDetails = output<string>();

  totalAmount = computed<string | null>(() => {
    const accounts = this.bank().accounts;

    const totalAmount = accounts
      ?.map((account) => account.balance)
      .reduce((a, b) => a + b, 0);
    return `${totalAmount}`;
  });
}
