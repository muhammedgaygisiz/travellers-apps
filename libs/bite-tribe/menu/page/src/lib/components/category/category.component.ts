import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import {
  IonButton,
  IonIcon,
  IonReorder,
  IonReorderGroup,
} from '@ionic/angular/standalone';
import { Category, MenuItem } from 'model';
import { NgTemplateOutlet } from '@angular/common';
import { AddItemComponent } from '../add-item/add-item.component';
import { MenuItemComponent } from '../menu-item/menu-item.component';
import { ItemReorderEventDetail } from '@ionic/angular';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './category.component.html',
  styleUrl: './category.component.scss',
  imports: [
    IonButton,
    NgTemplateOutlet,
    AddItemComponent,
    MenuItemComponent,
    IonReorderGroup,
    IonIcon,
    IonReorder,
  ],
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'category',
})
export class CategoryComponent {
  category = input<Category>();

  linkedCategory = linkedSignal(() => this.category());

  editMode = input(false);

  addItemToCategory = output<{
    item: MenuItem;
    category: Category;
    isVariant?: boolean;
  }>();

  orderingInCategoryChanged = output<Category>();

  presentShowAddItem = signal(false);

  shouldShowAddItem = computed(() => {
    const editModeEnabled = this.editMode();
    const presentShowAddItem = this.presentShowAddItem();

    return editModeEnabled && presentShowAddItem;
  });

  createBiteClick = output<MenuItem>();

  onAddItem(item: MenuItem, isVariant?: boolean) {
    this.presentShowAddItem.set(false);

    const category = this.linkedCategory();
    if (category) {
      this.addItemToCategory.emit({ item, category, isVariant });
    }
  }

  showAddItem() {
    this.presentShowAddItem.set(true);
  }

  onCancelAddItem() {
    this.presentShowAddItem.set(false);
  }

  onAddVariant(menuItem: MenuItem) {
    this.onAddItem(menuItem, true);
  }

  handleReorder(event: CustomEvent<ItemReorderEventDetail>) {
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
      this.orderingInCategoryChanged.emit(updatedCategory);
    }
  }
}
