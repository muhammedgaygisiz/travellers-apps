import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import {
  IonButton,
  IonIcon,
  IonReorder,
  IonReorderGroup,
  IonToggle,
  ItemReorderEventDetail,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { isMenuItemAvailable, type Menu, type MenuItem } from 'model';
import { type DishRef, priceLabel } from '../../utils/menu-edits';

export interface AvailabilityChange {
  readonly ref: DishRef;
  readonly available: boolean;
}

export interface DishMove {
  readonly categoryId: string;
  readonly from: number;
  readonly to: number;
}

interface VariantRow {
  readonly ref: DishRef;
  readonly name: string;
  readonly price: string;
  readonly available: boolean;
}

interface DishRow {
  readonly ref: DishRef;
  readonly name: string;
  readonly description: string;
  /** Empty for a dish with variants, which has no price of its own. */
  readonly price: string;
  readonly available: boolean;
  readonly variants: readonly VariantRow[];
}

interface CategoryRow {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly dishes: readonly DishRow[];
  /** "Extra cheese +CHF 2.00 · Olives +CHF 1.50", or empty. */
  readonly extras: string;
}

/**
 * The menu as the owner reads it (GitHub issue #2182): one line per dish, its
 * variants listed under it with their own price, and nothing editable but the
 * availability switches. A dish or a category opens its own editor.
 *
 * The switches are here because availability is the one thing an owner
 * changes during service, when opening an editor is one step too many.
 */
@Component({
  selector: 'bt-menu-list',
  templateUrl: './menu-list.component.html',
  styleUrl: './menu-list.component.scss',
  imports: [
    IonButton,
    IonIcon,
    IonReorder,
    IonReorderGroup,
    IonToggle,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuListComponent {
  readonly menu = input<Menu>();
  readonly currency = input<string>();
  /** The dish or category whose editor is open, highlighted in the list. */
  readonly selectedId = input<string>();

  readonly openDish = output<DishRef>();
  readonly openCategory = output<string>();
  readonly addDish = output<string>();
  readonly availabilityChange = output<AvailabilityChange>();
  readonly moveCategory = output<{ from: number; to: number }>();
  readonly moveDish = output<DishMove>();

  readonly categories = computed<CategoryRow[]>(() => {
    const currency = this.currency();

    return (this.menu()?.categories ?? []).map((category) => ({
      id: category.id,
      title: category.title,
      subtitle: category.subtitle ?? '',
      extras: (category.extrasBlock?.extras ?? [])
        .map((extra) => `${extra.name} +${priceLabel(extra.price, currency)}`)
        .join(' · '),
      dishes: (category.items ?? []).map((item) =>
        this.dishRow(category.id, item, currency),
      ),
    }));
  });

  private dishRow(
    categoryId: string,
    item: MenuItem,
    currency: string | undefined,
  ): DishRow {
    const variants = item.variants ?? [];

    return {
      ref: { categoryId, itemId: item.id },
      name: item.name,
      description: item.description ?? '',
      price:
        variants.length && !(item.price > 0)
          ? ''
          : priceLabel(item.price, currency),
      available: isMenuItemAvailable(item),
      variants: variants.map((variant) => ({
        ref: { categoryId, itemId: item.id, variantId: variant.id },
        // A variant written before issue #2182 repeats its dish's name and
        // carries its difference in the description.
        name:
          variant.name.trim() === item.name.trim() &&
          variant.description?.trim()
            ? variant.description.trim()
            : variant.name,
        price: priceLabel(variant.price, currency),
        available: isMenuItemAvailable(variant),
      })),
    };
  }

  protected toggle(
    ref: DishRef,
    event: CustomEvent<{ checked: boolean }>,
  ): void {
    this.availabilityChange.emit({ ref, available: event.detail.checked });
  }

  protected reorderCategories(
    event: CustomEvent<ItemReorderEventDetail>,
  ): void {
    event.stopPropagation();
    const { from, to } = event.detail;
    event.detail.complete(false);

    if (from !== to) {
      this.moveCategory.emit({ from, to });
    }
  }

  protected reorderDishes(
    categoryId: string,
    event: CustomEvent<ItemReorderEventDetail>,
  ): void {
    event.stopPropagation();
    const { from, to } = event.detail;
    event.detail.complete(false);

    if (from !== to) {
      this.moveDish.emit({ categoryId, from, to });
    }
  }
}
