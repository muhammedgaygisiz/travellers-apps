import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import type { Category, Menu, MenuItem } from 'model';
import {
  IonButton,
  IonIcon,
  IonReorder,
  IonReorderGroup,
} from '@ionic/angular/standalone';
import { BusinessAddCategoryComponent } from '../business-add-category/business-add-category.component';
import { BusinessCategoryComponent } from '../business-category/business-category.component';
import { NgTemplateOutlet } from '@angular/common';
import { ItemReorderEventDetail } from '@ionic/angular';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'business-menu',
  templateUrl: './business-menu.component.html',
  styleUrl: './business-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonButton,
    BusinessAddCategoryComponent,
    BusinessCategoryComponent,
    NgTemplateOutlet,
    IonReorderGroup,
    IonReorder,
    IonIcon,
    TranslocoPipe,
  ],
})
export class BusinessMenuComponent {
  menu = input<Menu>();

  linkedMenu = linkedSignal(() => this.menu());

  menuChange = output<Menu>();

  presentShowAddCategory = signal(false);

  shouldShowAddCategory = computed(() => {
    return this.presentShowAddCategory();
  });

  showAddCategory(): void {
    this.presentShowAddCategory.set(true);
  }

  onAddCategory(category: Category): void {
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

    const linkedMenu = this.linkedMenu();
    if (!linkedMenu) {
      return;
    }
    this.menuChange.emit(linkedMenu);
  }

  onAddItemToCategory($event: {
    item: MenuItem;
    category: Category;
    isVariant?: boolean;
  }): void {
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

    const linkedMenu = this.linkedMenu();
    if (linkedMenu) {
      this.menuChange.emit(linkedMenu);
    }
  }

  onCancelAddCategory(): void {
    this.presentShowAddCategory.set(false);
  }

  handleReorder(event: CustomEvent<ItemReorderEventDetail>): void {
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
          }),
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

    const linkedMenu = this.linkedMenu();
    if (linkedMenu) {
      this.menuChange.emit(linkedMenu);
    }
  }

  updateCategory(categoryWithNewOrderOfItems: Category): void {
    this.linkedMenu.update((menu) => {
      if (menu?.categories) {
        return {
          ...menu,
          categories: menu.categories.map((cat) =>
            cat.title === categoryWithNewOrderOfItems.title
              ? categoryWithNewOrderOfItems
              : cat,
          ),
        };
      }

      return menu;
    });

    const linkedMenu = this.linkedMenu();
    if (!linkedMenu) {
      return;
    }
    this.menuChange.emit(linkedMenu);
  }
}
