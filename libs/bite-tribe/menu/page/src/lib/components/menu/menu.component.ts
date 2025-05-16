import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { Menu, MenuItem } from 'model';
import { IonButton } from '@ionic/angular/standalone';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'bt-menu',
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonButton],
})
export class MenuComponent {
  menu = input<Menu>();

  createBiteClick = output<MenuItem>();
}
