import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Bite } from 'model';
import { IonItem, IonLabel, IonList } from '@ionic/angular/standalone';
import { CurrencyPipe } from '@angular/common';

@Component({
  selector: 'bt-menu-item',
  templateUrl: './menu-item.component.html',
  imports: [IonList, IonItem, IonLabel, CurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuItemComponent {
  bite = input<Bite>();
}
