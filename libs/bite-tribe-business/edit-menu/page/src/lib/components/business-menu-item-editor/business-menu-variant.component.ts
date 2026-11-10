import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
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

type VariantFormValue = {
  name: string;
  description: string;
  ingredients: string;
  notes: string;
  price: number;
  isAvailable: boolean;
};

const toFormValue = (item: MenuItem): VariantFormValue => ({
  name: item.name || '',
  description: item.description || '',
  ingredients: item.ingredients || '',
  notes: item.notes || '',
  price: item.price || 0,
  isAvailable: item.isAvailable !== false,
});

const sameFormValue = (a: VariantFormValue, b: VariantFormValue): boolean =>
  (Object.keys(b) as (keyof VariantFormValue)[]).every(
    (key) => a[key] === b[key],
  );

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
})
export class BusinessMenuVariantComponent {
  item = input<MenuItem>();

  isVariant = input(false, { transform: booleanAttribute });

  /**
   * The symbol the menu's prices are stated in (GitHub issue #1102).
   *
   * The field used to carry a hardcoded dollar sign, which now sits directly
   * beneath the currency the owner chose and contradicted it. Empty renders no
   * suffix, matching what a guest sees on a menu that states no currency.
   */
  currencySymbol = input('');

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

  /**
   * Follows the stored item into the form, but never over an edit in progress.
   *
   * It used to copy every field over on each change of `item`, and the editor
   * now re-reads the menu after every save instead of leaving (issue #1377) -
   * so a save of one item would have wiped an unsaved edit on every other one.
   * An edit the stored item already holds is no longer an edit, which is how a
   * successful save hides Save and Cancel again.
   */
  onItemChange = effect(() => {
    const item = this.item();

    if (!item) {
      return;
    }

    const stored = toFormValue(item);
    const form = this.itemForm();

    const holdsStored = sameFormValue(form.value(), stored);

    // Pristine and already showing the stored item: nothing to do, and
    // resetting anyway would write a new value object and run this effect
    // again. Dirty and different: an edit in progress, left alone.
    if (holdsStored === !form.dirty()) {
      return;
    }

    untracked(() => form.reset(stored));
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
      this.itemForm().reset(toFormValue(item));
    }
  }
}
