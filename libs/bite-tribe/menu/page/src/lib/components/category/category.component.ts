import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { IonReorderGroup } from '@ionic/angular/standalone';
import type { Category, MenuItem } from 'model';
import {
  MenuItemComponent,
  type MenuItemSelection,
} from '../menu-item/menu-item.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './category.component.html',
  styleUrl: './category.component.scss',
  imports: [MenuItemComponent, IonReorderGroup],
  selector: 'category',
})
export class CategoryComponent {
  category = input<Category>();

  linkedCategory = linkedSignal(() => this.category());

  /** Threaded to the items, which price and offer them (issue #1102). */
  currency = input<string>();

  canCreateBite = input(true, { transform: booleanAttribute });

  /** Threaded to the items, which are what a guest adds (issue #1103). */
  canAddToCart = input(false, { transform: booleanAttribute });

  createBiteClick = output<MenuItem>();

  addToCartClick = output<MenuItemSelection>();
}
