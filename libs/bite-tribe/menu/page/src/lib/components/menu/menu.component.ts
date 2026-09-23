import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import type { Menu, MenuItem, MenuItemStats } from 'model';
import { IonReorderGroup } from '@ionic/angular/standalone';
import { CategoryComponent } from '../category/category.component';
import type { MenuItemSelection } from '../menu-item/menu-item.component';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'bt-menu',
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CategoryComponent, IonReorderGroup, TranslocoPipe],
})
export class MenuComponent {
  menu = input<Menu>();

  linkedMenu = linkedSignal(() => this.menu());

  /**
   * The currency the menu's prices are stated in (issue #1102).
   *
   * Read off the menu by default, so the authenticated page needs no change and
   * a public page that already has the menu need not pass it twice.
   */
  readonly currency = computed(() => this.menu()?.currency);

  canCreateBite = input(true, { transform: booleanAttribute });

  /**
   * Whether the dishes offer an "add" button (GitHub issue #1103).
   *
   * Off by default, so the authenticated page and the public menu are
   * unchanged. Only the ordering screen of a guest at a table turns it on.
   */
  canAddToCart = input(false, { transform: booleanAttribute });

  createBiteClick = output<MenuItem>();

  /**
   * What people thought of each dish, keyed by menu item id
   * (GitHub issue #1113).
   *
   * A map rather than a value per row, because the whole menu's aggregates
   * arrive in one read and threading them item by item would put a lookup in
   * every template. Empty for a menu nobody has written a Bite about, which
   * today is nearly all of them.
   */
  stats = input<Record<string, MenuItemStats>>({});

  /** Somebody wants to read what people said about one dish. */
  biteSignalClick = output<MenuItem>();

  /** The dish, and the size where the guest chose one. */
  addToCartClick = output<MenuItemSelection>();
}
