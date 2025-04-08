import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import {
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
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
  ],
})
export class BankComponent {
  bank = input.required<Bank>();

  openAccountDetails = output<string>();
}
