import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { IonButton, IonIcon, IonInput } from '@ionic/angular/standalone';
import type { MenuItem } from 'model';
import { BusinessAddItemComponent } from '../business-add-item/business-add-item.component';
import { debounce, Field, form, required } from '@angular/forms/signals';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'business-menu-item',
  templateUrl: './business-menu-item.component.html',
  styleUrl: './business-menu-item.component.scss',
  imports: [IonButton, BusinessAddItemComponent, IonInput, Field, IonIcon],
})
export class BusinessMenuItemComponent {
  item = input<MenuItem>();

  isVariant = input(false, { transform: booleanAttribute });

  addedVariant = output<MenuItem>();

  itemChanged = output<MenuItem>();

  presentAddVariant = signal(false);

  itemModel = signal({
    name: this.item()?.name || '',
    description: this.item()?.description || '',
    price: this.item()?.price || '',
  });

  itemForm = form(this.itemModel, (schemaPath) => {
    required(schemaPath.name);
    required(schemaPath.description);
    required(schemaPath.price);
    debounce(schemaPath.name, 500);
    debounce(schemaPath.description, 500);
    debounce(schemaPath.price, 500);
  });

  onItemChange = effect(() => {
    const item = this.item();
    const nameHasValue =
      !!this.itemForm.name().value() && this.itemForm.name().value() !== '';
    if (!nameHasValue) {
      this.itemForm.name().value.set(item?.name || '');
      this.itemForm.description().value.set(item?.description || '');
      this.itemForm.price().value.set(item?.price || 0);
    }
  });

  onNameChange = effect(() => {
    const newName = this.itemForm.name().value();
    const newDescription = this.itemForm.description().value();
    const newPrice = this.itemForm.price().value();
    const item = this.item();

    if (
      newName !== item?.name ||
      newDescription !== item?.description ||
      newPrice !== item?.price
    ) {
      this.itemChanged.emit({
        ...this.item(),
        name: newName,
        description: newDescription,
        price: +newPrice,
      });
    }
  });

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
