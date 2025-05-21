import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { Menu, MenuItem } from 'model';
import { IonButton, IonInput } from '@ionic/angular/standalone';
import { AddCategoryComponent } from '../add-category/add-category.component';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'bt-menu',
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonButton, IonInput, AddCategoryComponent],
})
export class MenuComponent {
  menu = input<Menu>();

  editMode = input(false, { transform: booleanAttribute });

  presentShowAddCategory = signal(false);

  createBiteClick = output<MenuItem>();
  shouldShowAddCategory = computed(() => {
    const editModeEnabled = this.editMode();
    const presentShowAddCategory = this.presentShowAddCategory();

    return editModeEnabled && presentShowAddCategory;
  });

  showAddCategory() {
    this.presentShowAddCategory.set(true);
  }
}
