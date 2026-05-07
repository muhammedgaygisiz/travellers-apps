import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import {
  IonButton,
  IonIcon,
  IonInput,
  IonReorder,
  IonReorderGroup,
} from '@ionic/angular/standalone';
import type { Category, MenuItem } from 'model';
import { NgTemplateOutlet } from '@angular/common';
import { BusinessMenuVariantComponent } from '../business-menu-item-editor/business-menu-variant.component';
import { BusinessMenuItemComponent } from '../business-menu-item/business-menu-item.component';
import { ItemReorderEventDetail } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { debounce, Field, form, required } from '@angular/forms/signals';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './business-category.component.html',
  styleUrl: './business-category.component.scss',
  imports: [
    IonButton,
    NgTemplateOutlet,
    BusinessMenuVariantComponent,
    BusinessMenuItemComponent,
    IonReorderGroup,
    IonIcon,
    IonReorder,
    FormsModule,
    IonInput,
    ReactiveFormsModule,
    Field,
  ],
  selector: 'business-category',
})
export class BusinessCategoryComponent {
  category = input<Category>();

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
    debounce(schemaPath.title, 500);
    debounce(schemaPath.subtitle, 500);
  });

  onLinkedCategoryChange = effect(() => {
    const category = this.category();
    const titleHasValue =
      !!this.categoryForm.title().value() &&
      this.categoryForm.title().value() !== '';
    if (!titleHasValue) {
      this.categoryForm.title().value.set(category?.title || '');
      this.categoryForm.subtitle().value.set(category?.subtitle || '');
    }
  });

  onTitleSubtitleChange = effect(() => {
    const newTitle = this.categoryForm.title().value();
    const newSubtitle = this.categoryForm.subtitle().value();
    const linkedCategory = this.linkedCategory();
    if (
      newTitle !== linkedCategory?.title ||
      newSubtitle !== linkedCategory?.subtitle
    ) {
      this.categoryChanged.emit({
        ...this.linkedCategory(),
        items: this.linkedCategory()?.items || [],
        title: newTitle,
        subtitle: newSubtitle,
      });
    }
  });

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
      title: category?.title || '',
      items: updatedItems,
    });
  }

  onCancelAddItem(): void {
    this.presentShowAddItem.set(false);
  }

  onAddVariant(menuItem: MenuItem): void {
    this.onAddItem(menuItem, true);
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
