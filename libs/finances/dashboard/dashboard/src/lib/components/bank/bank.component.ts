import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import {
  IonItem,
  IonItemDivider,
  IonItemGroup,
  IonLabel,
  IonNote,
} from '@ionic/angular/standalone';
import { Bank } from 'finances/dashboard/data-access';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'finances-bank',
  templateUrl: './bank.component.html',
  imports: [IonItem, IonItemDivider, IonItemGroup, IonLabel, IonNote],
})
export class BankComponent {
  bank = input.required<Bank>();

  openAccountDetails = output<string>();
}
