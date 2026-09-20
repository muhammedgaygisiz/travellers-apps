import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { IonReorderGroup } from '@ionic/angular/standalone';
import { currencyCodes } from 'utils';
import type { Category, ExtraItem, MenuItem } from 'model';
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

  /**
   * The extras this category offers, which are the extras each of its dishes
   * may be ordered with (GitHub issue #1598).
   *
   * The category is where the rule is applied, because the category is the
   * only thing here that knows both the block and the dishes it covers. The
   * items are handed the answer rather than the menu, which keeps
   * `menu-item` a component that renders one dish.
   */
  readonly extras = computed<readonly ExtraItem[]>(
    () => this.linkedCategory()?.extrasBlock?.extras ?? [],
  );

  /**
   * Whether to print the extras as menu text rather than as tick boxes.
   *
   * The two are alternatives rather than both. A reader wants the section's
   * extras once, under its dishes, the way a paper menu prints them; a guest
   * ordering wants them beside the dish they are adding, priced and tickable.
   * Drawing both would put the same two lines on the screen twice, on the one
   * surface that is a phone held at a table.
   */
  readonly showExtrasBlock = computed(
    () => !this.canAddToCart() && this.extras().length > 0,
  );

  /** The symbol for {@link currency}, or the code where none is known. */
  private readonly currencySymbol = computed(() => {
    const code = this.currency();

    if (!code) {
      return '';
    }

    return currencyCodes.find((entry) => entry.code === code)?.symbol ?? code;
  });

  /** One extra as the menu reads it, on the same terms as a dish's price. */
  extraPriceLabel(extra: ExtraItem): string {
    const symbol = this.currencySymbol();

    return symbol ? `${extra.price} ${symbol}` : `${extra.price}`;
  }
}
