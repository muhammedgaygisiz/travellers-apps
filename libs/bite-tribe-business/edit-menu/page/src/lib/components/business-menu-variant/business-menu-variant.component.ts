import {
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
import { debounce, Field, form, required } from '@angular/forms/signals';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './business-menu-variant.component.html',
  styleUrl: './business-menu-variant.component.scss',
  imports: [IonButton, IonInput, IonList, IonItem, Field],
  selector: 'business-menu-variant',
  standalone: true,
})
export class BusinessMenuVariantComponent {
  item = input<MenuItem>();

  itemChanged = output<MenuItem>();

  addItem = output<MenuItem>();

  cancelAddItem = output();

  itemModel = signal({
    name: this.item()?.name || '',
    description: this.item()?.description || '',
    ingredients: this.item()?.ingredients || '',
    notes: this.item()?.notes || '',
    price: this.item()?.price || '',
  });

  itemForm = form(this.itemModel, (schemaPath) => {
    required(schemaPath.name);
    required(schemaPath.price);
    debounce(schemaPath.name, 500);
    debounce(schemaPath.description, 500);
    debounce(schemaPath.price, 500);
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

  isAddDisabled = computed(() => {
    const itemForm = this.itemForm();
    return !itemForm.valid();
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
