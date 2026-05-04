import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import type { MenuItem } from 'model';
import { BusinessAddItemComponent } from '../business-add-item/business-add-item.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'business-menu-item',
  templateUrl: './business-menu-item.component.html',
  styleUrl: './business-menu-item.component.scss',
  imports: [IonButton, BusinessAddItemComponent, IonIcon],
})
export class BusinessMenuItemComponent {
  item = input<MenuItem>();

  isVariant = input(false, { transform: booleanAttribute });

  addedVariant = output<MenuItem>();

  presentAddVariant = signal(false);

  shouldShowAddVariant = computed(() => {
    return this.presentAddVariant();
  });

  onAddVariantClick(): void {
    this.presentAddVariant.set(true);
  }

  onAddVariant(variant: MenuItem): void {
    this.presentAddVariant.set(false);

    const currentItem = this.item();

    if (currentItem) {
      const newItem = {
        ...currentItem,
        variants: [...(currentItem.variants || []), variant],
      };

      this.addedVariant.emit(newItem);
    }
  }

  onEditVariant(): void {
    // TODO
  }
}
