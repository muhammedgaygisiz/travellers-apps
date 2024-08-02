import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { PageComponent } from 'common/ui/page';
import { CardComponent } from 'common/ui/card';
import {
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonItem,
  IonItemDivider,
  IonItemGroup,
  IonLabel,
  IonList,
  IonNote,
} from '@ionic/angular/standalone';
import { BankComponent } from '../bank/bank.component';
import { NgClass } from '@angular/common';
import { BANKS } from '../../integration/banks';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'finances-dashboard',
  templateUrl: './dashboard.component.html',
  imports: [
    PageComponent,
    CardComponent,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    IonItemGroup,
    IonItemDivider,
    BankComponent,
    NgClass,
  ],
})
export class DashboardComponent {
  banks = BANKS;

  counter = signal(0);

  increment() {
    this.counter.set(this.counter() + 1);
  }
}
