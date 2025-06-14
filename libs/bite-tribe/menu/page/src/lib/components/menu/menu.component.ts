import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { Category, Menu, MenuItem } from 'model';
import {
  IonButton,
  IonIcon,
  IonReorder,
  IonReorderGroup,
} from '@ionic/angular/standalone';
import { AddCategoryComponent } from '../add-category/add-category.component';
import { CategoryComponent } from '../category/category.component';
import { NgTemplateOutlet } from '@angular/common';
import { ItemReorderEventDetail } from '@ionic/angular';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'bt-menu',
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonButton,
    AddCategoryComponent,
    CategoryComponent,
    NgTemplateOutlet,
    IonReorderGroup,
    IonReorder,
    IonIcon,
  ],
})
export class MenuComponent {
  menu = input<Menu>();

  linkedMenu = linkedSignal(() => this.menu());

  editMode = input(false, { transform: booleanAttribute });

  presentShowAddCategory = signal(false);

  createBiteClick = output<MenuItem>();

  saveMenu = output<Menu>();

  shouldShowAddCategory = computed(() => {
    const editModeEnabled = this.editMode();
    const presentShowAddCategory = this.presentShowAddCategory();

    return editModeEnabled && presentShowAddCategory;
  });

  showAddCategory() {
    this.presentShowAddCategory.set(true);
  }

  onAddCategory(category: Category) {
    this.presentShowAddCategory.set(false);

    this.linkedMenu.update((curr) => {
      const categories = curr?.categories || [];

      // Set the index for the new category to be after the last existing category
      const newCategory = {
        ...category,
        index: categories.length,
      };

      return {
        ...curr,
        categories: [...categories, newCategory],
      } as Menu;
    });
  }

  onSave() {
    const menu = this.linkedMenu();

    if (menu) {
      this.saveMenu.emit(menu);
    }
  }

  onAddItemToCategory($event: {
    item: MenuItem;
    category: Category;
    isVariant?: boolean;
  }) {
    this.linkedMenu.update((currMenu) => {
      if (currMenu) {
        return {
          ...currMenu,
          categories: currMenu.categories.map((category) => {
            if (category.title === $event.category.title) {
              if (!$event.isVariant) {
                return {
                  ...category,
                  items: [...(category.items || []), $event.item],
                } as Category;
              }

              return {
                ...category,
                items: category.items.map((item) => {
                  if (item.name === $event.item.name) {
                    return {
                      ...item,
                      variants: [...($event.item.variants || [])],
                    } as MenuItem;
                  }

                  return item;
                }),
              };
            }

            return category;
          }),
        };
      }

      return currMenu;
    });
  }

  onCancelAddCategory() {
    this.presentShowAddCategory.set(false);
  }

  handleReorder(event: CustomEvent<ItemReorderEventDetail>) {
    const fromIndex = event.detail.from;
    const toIndex = event.detail.to;

    this.linkedMenu.update((menu) => {
      if (menu?.categories) {
        // Create a copy of the categories array
        const updatedCategories = [...menu.categories];

        // Remove the item from the original position
        const [movedCategory] = updatedCategories.splice(fromIndex, 1);

        // Insert the item at the destination position
        updatedCategories.splice(toIndex, 0, movedCategory);

        // Update the index property of each category based on its new position
        const categoriesWithUpdatedIndices = updatedCategories.map(
          (category, idx) => ({
            ...category,
            index: idx,
          })
        );

        // Return the updated menu with reordered categories and updated indices
        return {
          ...menu,
          categories: categoriesWithUpdatedIndices,
        };
      }
      return menu;
    });

    // Complete the reorder operation
    event.detail.complete();
  }

  updateCategory(categoryWithNewOrderOfItems: Category) {
    this.linkedMenu.update((menu) => {
      if (menu?.categories) {
        return {
          ...menu,
          categories: menu.categories.map((cat) =>
            cat.title === categoryWithNewOrderOfItems.title
              ? categoryWithNewOrderOfItems
              : cat
          ),
        };
      }

      return menu;
    });
  }
}
