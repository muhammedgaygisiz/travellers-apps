import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { IonButton } from '@ionic/angular/standalone';
import { Category, MenuItem } from 'model';
import { NgTemplateOutlet } from '@angular/common';
import { AddItemComponent } from '../add-item/add-item.component';
import { MenuItemComponent } from '../menu-item/menu-item.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './category.component.html',
  styleUrl: './category.component.scss',
  imports: [IonButton, NgTemplateOutlet, AddItemComponent, MenuItemComponent],
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
}
