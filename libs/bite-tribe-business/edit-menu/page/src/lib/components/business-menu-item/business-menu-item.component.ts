import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { IonButton } from '@ionic/angular/standalone';
import type { MenuItem } from 'model';
import { BusinessMenuVariantComponent } from '../business-menu-variant/business-menu-variant.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'business-menu-item',
  templateUrl: './business-menu-item.component.html',
  styleUrl: './business-menu-item.component.scss',
  imports: [IonButton, BusinessMenuVariantComponent],
})
export class BusinessMenuItemComponent {
  item = input<MenuItem>();

  isVariant = input(false, { transform: booleanAttribute });

  addedVariant = output<MenuItem>();

  itemChanged = output<MenuItem>();

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

  onCancelAddItem(): void {
    this.presentAddVariant.set(false);
  }

  onEditVariant(): void {
    // TODO
  }
}
