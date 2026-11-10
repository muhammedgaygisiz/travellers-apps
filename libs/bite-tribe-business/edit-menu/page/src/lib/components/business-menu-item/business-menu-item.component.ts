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
import { IonButton, IonInput } from '@ionic/angular/standalone';
import type { MenuItem } from 'model';
import { BusinessMenuVariantComponent } from '../business-menu-item-editor/business-menu-variant.component';
import { FormField, form, required } from '@angular/forms/signals';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'business-menu-item',
  templateUrl: './business-menu-item.component.html',
  styleUrl: './business-menu-item.component.scss',
  imports: [
    IonButton,
    BusinessMenuVariantComponent,
    IonInput,
    FormField,
    TranslocoPipe,
  ],
})
export class BusinessMenuItemComponent {
  item = input<MenuItem>();
  /** The symbol the menu's prices are stated in (issue #1102). */
  currencySymbol = input('');

  isVariant = input(false, { transform: booleanAttribute });

  addedVariant = output<MenuItem>();

  itemChanged = output<MenuItem>();

  presentAddVariant = signal(false);

  itemModel = signal({
    name: this.item()?.name || '',
  });

  itemForm = form(this.itemModel, (schemaPath) => {
    required(schemaPath.name);
  });

  /** Whether the name holds an edit that has not been saved yet. */
  isNameEdited = computed(() => this.itemForm().dirty());

  /**
   * Follows the stored item into the form, but never over an edit in progress:
   * a menu that reloads while the owner is typing would otherwise put the
   * stored name back under their cursor. A name the stored item already holds
   * is no longer an edit, which is how a successful save hides Save and Cancel
   * again (issue #1377).
   */
  onItemChange = effect(() => {
    const item = this.item();

    if (!item) {
      return;
    }

    const stored = item.name || '';
    const form = this.itemForm();

    const holdsStored = form.value().name === stored;

    // Nothing to do, and resetting anyway would write a new value object and
    // run this effect again.
    if (holdsStored === !form.dirty()) {
      return;
    }

    untracked(() => form.reset({ name: stored }));
  });

  /**
   * Saves the renamed item.
   *
   * Before this, the name field had no way out of the component: it updated
   * its own form and nothing else, so a rename showed on screen and was gone
   * the next time the menu loaded.
   *
   * A variant is created carrying its item's name (see the category's
   * `onAddVariant`), and an order line prints both. A variant still holding the
   * old name is renamed with the item, so a guest's order does not read
   * "New name (Old name)". A variant with a name of its own keeps it.
   */
  saveName(): void {
    const item = this.item();

    if (!item || !this.itemForm().valid()) {
      return;
    }

    const name = this.itemForm.name().value();

    this.itemChanged.emit({
      ...item,
      name,
      ...(item.variants
        ? {
            variants: item.variants.map((variant) =>
              variant.name === item.name ? { ...variant, name } : variant,
            ),
          }
        : {}),
    });
  }

  /** Puts the stored name back and drops the edit. */
  cancelName(): void {
    this.itemForm().reset({ name: this.item()?.name || '' });
  }

  showNewVariantComponent = computed(() => {
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

  onEditVariant(changes: MenuItem, index?: number): void {
    const item = this.item();

    if (!item) {
      return;
    }

    if (index != null) {
      this.emitVariantChanges(item, changes, index);
      return;
    }
    this.emitItemChanges(item, changes);
  }

  private emitItemChanges(item: MenuItem, changes: MenuItem): void {
    this.itemChanged.emit({
      ...item,
      ...changes,
    });
  }

  private emitVariantChanges(
    item: MenuItem,
    changes: MenuItem,
    index: number,
  ): void {
    if (!item.variants || !item.variants.length) {
      return;
    }

    // Merged rather than replaced: the editor form holds the editable fields,
    // so assigning its value over the variant dropped everything the form does
    // not carry - the variant's own id included (issue #1099).
    const newVariants = [...item.variants];
    newVariants[index] = { ...newVariants[index], ...changes };
    this.itemChanged.emit({
      ...item,
      variants: newVariants,
    });
  }
}
