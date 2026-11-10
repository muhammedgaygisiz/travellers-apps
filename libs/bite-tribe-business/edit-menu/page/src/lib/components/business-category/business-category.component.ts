import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  linkedSignal,
  output,
  signal,
  untracked,
} from '@angular/core';
import {
  IonButton,
  IonIcon,
  IonInput,
  IonReorder,
  IonReorderGroup,
} from '@ionic/angular/standalone';
import type { Category, MenuItem } from 'model';
import { createEntityId } from 'utils';
import { NgTemplateOutlet } from '@angular/common';
import {
  BusinessCategoryExtrasComponent,
  type ExtrasBlock,
} from '../business-category-extras/business-category-extras.component';
import { BusinessMenuVariantComponent } from '../business-menu-item-editor/business-menu-variant.component';
import { BusinessMenuItemComponent } from '../business-menu-item/business-menu-item.component';
import { ItemReorderEventDetail } from '@ionic/angular';
import { FormField, form, required } from '@angular/forms/signals';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './business-category.component.html',
  styleUrl: './business-category.component.scss',
  imports: [
    IonButton,
    NgTemplateOutlet,
    BusinessCategoryExtrasComponent,
    BusinessMenuVariantComponent,
    BusinessMenuItemComponent,
    IonReorderGroup,
    IonIcon,
    IonReorder,
    IonInput,
    FormField,
    TranslocoPipe,
  ],
  selector: 'business-category',
})
export class BusinessCategoryComponent {
  category = input<Category>();
  /** The symbol the menu's prices are stated in (issue #1102). */
  currencySymbol = input('');

  linkedCategory = linkedSignal(() => this.category());

  addItemToCategory = output<{
    item: MenuItem;
    category: Category;
    isVariant?: boolean;
  }>();

  categoryChanged = output<Category>();

  presentShowAddItem = signal(false);

  categoryModel = signal({
    title: this.linkedCategory()?.title || '',
    subtitle: this.linkedCategory()?.subtitle || '',
  });

  categoryForm = form(this.categoryModel, (schemaPath) => {
    required(schemaPath.title);
  });

  /**
   * Whether the title or subtitle holds an edit that has not been saved yet.
   * The Save and Cancel buttons only show while it does.
   */
  isTitleEdited = computed(() => this.categoryForm().dirty());

  /**
   * Follows the stored category into the form, but never over an edit in
   * progress.
   *
   * It used to refill the form only when the title was empty, which turned a
   * cleared title straight back into the stored one, so `required` could never
   * show. Now a stored change is taken while the form is pristine, and an edit
   * the stored category already holds is no longer an edit: that is how a
   * successful save hides Save and Cancel again, since the editor re-reads the
   * menu after one (issue #1377). Any other edit is left alone until the owner
   * saves or cancels it - the same rule the reactive forms follow (see
   * Implementation - Feature Patterns).
   */
  onLinkedCategoryChange = effect(() => {
    const category = this.category();
    const stored = {
      title: category?.title || '',
      subtitle: category?.subtitle || '',
    };
    const form = this.categoryForm();
    const { title, subtitle } = form.value();
    const holdsStored = title === stored.title && subtitle === stored.subtitle;

    // Nothing to do, and resetting anyway would write a new value object and
    // run this effect again.
    if (holdsStored && !form.dirty()) {
      return;
    }

    if (!holdsStored && form.dirty()) {
      return;
    }

    untracked(() => form.reset(stored));
  });

  /**
   * Saves the title and subtitle.
   *
   * An explicit action rather than an effect on the form value. The effect
   * saved on every pause in typing, and a menu save then also left the editor,
   * so a half-typed title was stored and the owner was put back on the
   * restaurant page mid-word (issue #1377).
   *
   * The id travels with the rename (issue #1099). The editor keys by it, and the
   * title being edited is precisely the thing it used to key by.
   */
  saveTitle(): void {
    if (!this.categoryForm().valid()) {
      return;
    }

    const { title, subtitle } = this.categoryForm().value();
    const linkedCategory = this.linkedCategory();

    this.categoryChanged.emit({
      ...linkedCategory,
      id: linkedCategory?.id ?? createEntityId(),
      items: linkedCategory?.items || [],
      title,
      subtitle,
    });
  }

  /** Puts the stored title and subtitle back and drops the edit. */
  cancelTitle(): void {
    const category = this.category();

    this.categoryForm().reset({
      title: category?.title || '',
      subtitle: category?.subtitle || '',
    });
  }

  shouldShowAddItem = computed(() => {
    return this.presentShowAddItem();
  });

  onAddItem(item: MenuItem, isVariant?: boolean): void {
    this.presentShowAddItem.set(false);

    const category = this.linkedCategory();
    if (category) {
      this.addItemToCategory.emit({ item, category, isVariant });
    }
  }

  showAddItem(): void {
    this.presentShowAddItem.set(true);
  }

  onChangeItem(item: MenuItem, index: number): void {
    const category = this.linkedCategory();
    const updatedItems = category?.items ? [...category.items] : [];
    updatedItems[index] = item;
    this.categoryChanged.emit({
      ...category,
      id: category?.id ?? createEntityId(),
      title: category?.title || '',
      items: updatedItems,
    });
  }

  onCancelAddItem(): void {
    this.presentShowAddItem.set(false);
  }

  /**
   * The category's extras, as the extras editor now has them
   * (GitHub issue #1598).
   *
   * Merged and emitted on the one `categoryChanged` output every other edit
   * here goes through, so extras ride the existing save rather than needing a
   * partial write of their own - there is no such thing in this editor, and
   * inventing one would give a menu two ways to be persisted.
   *
   * An `undefined` block is written as `undefined` rather than dropped,
   * because that is how the last extra is removed: the merge below would
   * otherwise keep whatever the category already held.
   */
  onExtrasBlockChanged(extrasBlock: ExtrasBlock): void {
    const category = this.linkedCategory();

    this.categoryChanged.emit({
      ...category,
      id: category?.id ?? createEntityId(),
      title: category?.title || '',
      items: category?.items || [],
      extrasBlock,
    });
  }

  onAddVariant(newVariant: MenuItem, item: MenuItem): void {
    this.onAddItem(
      {
        ...newVariant,
        name: item.name,
      },
      true,
    );
  }

  handleReorder(event: CustomEvent<ItemReorderEventDetail>): void {
    // Stop the event from bubbling up to parent reorder groups
    event.stopPropagation();

    const fromIndex = event.detail.from;
    const toIndex = event.detail.to;

    this.linkedCategory.update((category) => {
      if (category && category.items) {
        // Create a copy of the items array
        const updatedItems = [...category.items];

        // Remove the item from the original position
        const [movedItem] = updatedItems.splice(fromIndex, 1);

        // Insert the item at the destination position
        updatedItems.splice(toIndex, 0, movedItem);

        // Update the index property of each item based on its new position
        const itemsWithUpdatedIndices = updatedItems.map((item, idx) => ({
          ...item,
          index: idx,
        }));

        // Return the updated category with reordered items
        return {
          ...category,
          items: itemsWithUpdatedIndices,
        };
      }
      return category;
    });

    // Complete the reorder operation
    event.detail.complete();

    const updatedCategory = this.linkedCategory();
    if (updatedCategory) {
      this.categoryChanged.emit(updatedCategory);
    }
  }
}
