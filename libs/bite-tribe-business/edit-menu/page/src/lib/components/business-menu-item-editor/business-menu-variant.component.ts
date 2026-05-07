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
import {
  IonButton,
  IonInput,
  IonItem,
  IonList,
} from '@ionic/angular/standalone';
import type { MenuItem } from 'model';
import { debounce, Field, form, min, required } from '@angular/forms/signals';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './business-menu-item-editor.component.html',
  styleUrl: './business-menu-item-editor.component.scss',
  imports: [IonButton, IonInput, IonList, IonItem, Field],
  selector: 'business-menu-variant',
  standalone: true,
})
export class BusinessMenuVariantComponent {
  item = input<MenuItem>();

  isVariant = input(false, { transform: booleanAttribute });

  itemChanged = output<MenuItem>();

  addItem = output<MenuItem>();

  cancelAddItem = output();

  itemModel = signal({
    name: this.item()?.name || '',
    description: this.item()?.description || '',
    ingredients: this.item()?.ingredients || '',
    notes: this.item()?.notes || '',
    price: this.item()?.price || 0,
  });

  itemForm = form(this.itemModel, (schemaPath) => {
    required(schemaPath.name);
    required(schemaPath.price, {
      message: 'Promo code is required for discounts',
    });
    min(schemaPath.price, 0);
  });

  onItemChange = effect(() => {
    const item = this.item();
    if (item) {
      this.itemForm.name().value.set(item?.name || '');
      this.itemForm.description().value.set(item?.description || '');
      this.itemForm.ingredients().value.set(item?.ingredients || '');
      this.itemForm.notes().value.set(item?.notes || '');
      this.itemForm.price().value.set(item?.price || 0);
    }
  });

  isSaveDisabled = computed(() => {
    const itemForm = this.itemForm();
    return !itemForm.valid() || !itemForm.dirty();
  });

  onUpdateItem(): void {
    if (this.itemForm().valid()) {
      this.itemChanged.emit(this.itemForm().value() as MenuItem);
    }
  }

  onAddItem(): void {
    if (this.itemForm().valid()) {
      this.addItem.emit(this.itemForm().value() as MenuItem);
    }
  }

  resetForm(): void {
    const item = this.item();
    if (item) {
      this.itemForm().reset({
        name: item.name,
        description: item.description,
        ingredients: item.ingredients || '',
        notes: item.notes || '',
        price: item.price,
      });
    }
  }
}
