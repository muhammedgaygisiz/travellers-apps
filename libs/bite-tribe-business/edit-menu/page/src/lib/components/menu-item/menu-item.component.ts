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
import { AddItemComponent } from '../add-item/add-item.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'menu-item',
  templateUrl: './menu-item.component.html',
  styleUrl: './menu-item.component.scss',
  imports: [IonButton, AddItemComponent],
})
export class MenuItemComponent {
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
}
