import { Component, input } from '@angular/core';
import { Bite } from 'model';
import { IonItem, IonLabel, IonList } from '@ionic/angular/standalone';

@Component({
  selector: 'bt-menu-item',
  templateUrl: './menu-item.component.html',
  imports: [IonList, IonItem, IonLabel],
})
export class MenuItemComponent {
  bite = input<Bite>();
}
