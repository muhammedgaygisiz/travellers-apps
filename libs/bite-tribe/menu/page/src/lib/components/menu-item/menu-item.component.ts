import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { IonButton } from '@ionic/angular/standalone';
import type { MenuItem } from 'model';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'menu-item',
  templateUrl: './menu-item.component.html',
  styleUrl: './menu-item.component.scss',
  imports: [IonButton, TranslocoPipe],
})
export class MenuItemComponent {
  item = input<MenuItem>();

  isVariant = input(false, { transform: booleanAttribute });

  createBiteClick = output<MenuItem>();

  onCreateBiteClick(itemData: MenuItem | undefined): void {
    if (itemData && !this.isUnavailable(itemData)) {
      this.createBiteClick.emit(itemData);
    }
  }

  isUnavailable(itemData: MenuItem | undefined): boolean {
    return itemData?.isAvailable === false;
  }
}
