import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { IonButton } from '@ionic/angular/standalone';
import { MenuItem } from 'model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'menu-item',
  templateUrl: './menu-item.component.html',
  styleUrl: './menu-item.component.scss',
  imports: [IonButton],
})
export class MenuItemComponent {
  item = input<MenuItem>();

  editMode = input(false);

  createBiteClick = output<MenuItem>();

  onCreateBiteClick(itemData: MenuItem | undefined) {
    if (itemData) {
      this.createBiteClick.emit(itemData);
    }
  }
}
