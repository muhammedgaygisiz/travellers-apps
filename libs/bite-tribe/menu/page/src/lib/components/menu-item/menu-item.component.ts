import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { IonButton } from '@ionic/angular/standalone';
import { isMenuVariantAvailable } from 'model';
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

  /**
   * The dish this is a variant of, where it is one.
   *
   * A variant rendered on its own flag alone contradicted the menu above it: an
   * owner who takes a dish off the menu has said the dish is off, and its sizes
   * are sizes of that dish, so offering the large one because nobody toggled it
   * separately puts an unorderable item in front of the guest (issue #1099).
   */
  parentItem = input<MenuItem>();

  createBiteClick = output<MenuItem>();

  onCreateBiteClick(itemData: MenuItem | undefined): void {
    if (itemData && !this.isUnavailable(itemData)) {
      this.createBiteClick.emit(itemData);
    }
  }

  isUnavailable(itemData: MenuItem | undefined): boolean {
    return !isMenuVariantAvailable(this.parentItem(), itemData);
  }
}
