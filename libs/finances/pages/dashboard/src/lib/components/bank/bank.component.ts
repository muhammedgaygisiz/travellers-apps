import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import {
  IonItem,
  IonItemDivider,
  IonItemGroup,
  IonLabel,
  IonNote,
} from '@ionic/angular/standalone';
import { Bank } from '../../model/bank';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'finances-bank',
  templateUrl: './bank.component.html',
  imports: [IonItem, IonItemDivider, IonItemGroup, IonLabel, IonNote],
})
export class BankComponent {
  bank = input.required<Bank>();
}
