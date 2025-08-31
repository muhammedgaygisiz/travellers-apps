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
import { MenuItem } from 'model';
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

  editMode = input(false);

  createBiteClick = output<MenuItem>();

  addedVariant = output<MenuItem>();

  presentAddVariant = signal(false);

  shouldShowAddVariant = computed(() => {
    const editModeEnabled = this.editMode();
    const presentAddVariant = this.presentAddVariant();

    return editModeEnabled && presentAddVariant;
  });

  shouldShowCreateBite = computed(() => {
    const editModeEnabled = this.editMode();

    const price = this.item()?.price;
    const variants = this.item()?.variants || [];
    if (price === 0 && variants.length > 0) {
      return false;
    }

    return !editModeEnabled;
  });

  onCreateBiteClick(itemData: MenuItem | undefined): void {
    if (itemData) {
      this.createBiteClick.emit(itemData);
    }
  }

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
