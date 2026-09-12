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
  IonToggle,
} from '@ionic/angular/standalone';
import type { MenuItem } from 'model';
import { createEntityId } from 'utils';
import { FormField, form, min, required } from '@angular/forms/signals';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './business-menu-item-editor.component.html',
  styleUrl: './business-menu-item-editor.component.scss',
  imports: [
    IonButton,
    IonInput,
    IonList,
    IonItem,
    IonToggle,
    FormField,
    TranslocoPipe,
  ],
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
    isAvailable: this.item()?.isAvailable !== false,
  });

  itemForm = form(this.itemModel, (schemaPath) => {
    required(schemaPath.name, {
      message: 'Name is required',
      when: () => !this.isVariant(),
    });
    required(schemaPath.price, { message: 'Price is required' });
    min(schemaPath.price, 0.000001);
  });

  onItemChange = effect(() => {
    const item = this.item();
    if (item) {
      this.itemForm.name().value.set(item.name);
      this.itemForm.description().value.set(item.description || '');
      this.itemForm.ingredients().value.set(item.ingredients || '');
      this.itemForm.notes().value.set(item.notes || '');
      this.itemForm.price().value.set(item.price || 0);
      this.itemForm.isAvailable().value.set(item.isAvailable !== false);
    }
  });

  isChangeButtonsHidden = computed(() => {
    const itemForm = this.itemForm();
    return !itemForm.dirty();
  });

  isSaveDisabled = computed(() => {
    const itemForm = this.itemForm();
    return !itemForm.valid() || this.isChangeButtonsHidden();
  });

  /**
   * Emits the edited fields **with the item's own id**.
   *
   * The form model holds the editable fields and nothing else, so the value it
   * produces has no id at all. Emitting that as the item is what a rename
   * looked like before issue #1099: every field replaced, including the one
   * that says which item this is.
   */
  onUpdateItem(): void {
    if (this.itemForm().valid()) {
      this.itemChanged.emit({
        ...(this.itemForm().value() as MenuItem),
        id: this.item()?.id ?? createEntityId(),
      });
    }
  }

  /** A new item or variant is born with its id, like a new category. */
  onAddItem(): void {
    if (this.itemForm().valid()) {
      this.addItem.emit({
        ...(this.itemForm().value() as MenuItem),
        id: createEntityId(),
      });
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
        isAvailable: item.isAvailable !== false,
      });
    }
  }
}
