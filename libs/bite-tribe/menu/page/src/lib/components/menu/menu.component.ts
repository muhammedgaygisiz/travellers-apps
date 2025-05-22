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
import { IonButton } from '@ionic/angular/standalone';
import { AddCategoryComponent } from '../add-category/add-category.component';
import { CategoryComponent } from '../category/category.component';
import { NgTemplateOutlet } from '@angular/common';

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
      return {
        ...curr,
        categories: [...(curr?.categories || []), category],
      } as Menu;
    });
  }

  onSave() {
    const menu = this.linkedMenu();

    if (menu) {
      this.saveMenu.emit(menu);
    }
  }

  onAddItemToCategory($event: { item: MenuItem; category: Category }) {
    this.linkedMenu.update((currMenu) => {
      if (currMenu) {
        return {
          ...currMenu,
          categories: currMenu.categories.map((category) => {
            if (category.title === $event.category.title) {
              return {
                ...category,
                items: [...(category.items || []), $event.item],
              } as Category;
            }

            return category;
          }),
        };
      }

      return currMenu;
    });
  }
}
