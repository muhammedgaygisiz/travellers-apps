import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { IonButton, IonCheckbox } from '@ionic/angular/standalone';
import { isMenuVariantAvailable } from 'model';
import type { ExtraItem, MenuItem } from 'model';
import { TranslocoPipe } from '@jsverse/transloco';
import { currencyCodes } from 'utils';

/**
 * A dish a guest picked, with the size where they picked one
 * (GitHub issue #1103).
 *
 * Structural rather than a class, so the cart of
 * `bite-tribe/table-order-data-access` takes it without this library and that
 * one depending on each other - which the Nx boundary rules would refuse in one
 * direction and which nothing needs in the other.
 */
export interface MenuItemSelection {
  item: MenuItem;
  variant?: MenuItem;
  /**
   * The extras the guest ticked on this row (GitHub issue #1598).
   *
   * Absent on every surface that is not ordering, and on an orderable row
   * whose category offers none.
   */
  extras?: ExtraItem[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'menu-item',
  templateUrl: './menu-item.component.html',
  styleUrl: './menu-item.component.scss',
  imports: [IonButton, IonCheckbox, NgTemplateOutlet, TranslocoPipe],
})
export class MenuItemComponent {
  item = input<MenuItem>();

  isVariant = input(false, { transform: booleanAttribute });

  /**
   * The dish this is a variant of, where it is one.
   *
   * A variant rendered on its own flag alone contradicted the menu above it: an
   * owner who takes a dish off the menu has said the dish is off, and its sizes
   * are sizes of that dish, so offering the large one because nobody toggled it
   * separately puts an unorderable item in front of the guest (issue #1099).
   */
  parentItem = input<MenuItem>();

  /**
   * The currency this menu's prices are stated in, as an ISO 4217 code
   * (GitHub issue #1102).
   *
   * Absent renders a bare number. The price used to carry a hardcoded euro
   * sign, which was wrong for every restaurant outside the euro zone and wrong
   * silently - a guest reading `1200 €` at a Tokyo counter has no way to know
   * the symbol was a placeholder. A number with no symbol is something they can
   * ask about; a wrong symbol is something they believe.
   */
  currency = input<string>();

  /**
   * Whether to offer turning this dish into a Bite.
   *
   * False on the public menu of issue #1102, where the reader may have no
   * BiteTribe account at all - the button would open a flow that asks them to
   * sign up for a product they came to read a menu of. Defaults to true so the
   * authenticated menu is unchanged.
   */
  canCreateBite = input(true, { transform: booleanAttribute });

  /** The symbol for {@link currency}, or the code where none is known. */
  readonly currencySymbol = computed(() => {
    const code = this.currency();

    if (!code) {
      return '';
    }

    return currencyCodes.find((entry) => entry.code === code)?.symbol ?? code;
  });

  /**
   * The price as it is read, with the symbol only where there is one.
   *
   * Built here rather than as `{{ price }} {{ symbol }}` in the template,
   * because that interpolation always emits the separator: a menu that states
   * no currency rendered `"1200 "`, with a space nothing follows. Harmless
   * where the block ends there and not where it does not - a right-aligned or
   * width-measured cell keeps it, and so does anything reading `textContent`.
   *
   * A price that is absent renders as nothing at all, rather than as the lone
   * symbol the old interpolation produced for it.
   */
  readonly priceLabel = computed(() => {
    const price = this.item()?.price;

    if (price === undefined || price === null) {
      return '';
    }

    const symbol = this.currencySymbol();

    return symbol ? `${price} ${symbol}` : `${price}`;
  });

  /**
   * Whether to offer adding this dish to a table cart (GitHub issue #1103).
   *
   * False everywhere but the ordering screen, so the authenticated menu and the
   * public one are unchanged: a reader who is not at a table has nothing to add
   * a dish to, and a button that opens a cart nobody can send is worse than no
   * button.
   *
   * Deliberately independent of {@link canCreateBite}. The ordering screen
   * offers one and not the other - the guest may have no account - and a single
   * "is this interactive" flag would have made those two decisions one.
   */
  canAddToCart = input(false, { transform: booleanAttribute });

  /**
   * The extras this dish may be ordered with (GitHub issue #1598).
   *
   * Passed in rather than read off a category, because this component is given
   * one dish and has never been given the menu around it. The category above
   * decides - a dish's extras are its category's, `menuExtrasForItem` - and
   * threads the answer down, including into the variant rows below: a large
   * Margherita is a Margherita, and takes the extras of the section it is
   * printed in.
   *
   * Drawn only in ordering mode. The two reading surfaces render the
   * category's extras block once, under the dishes, which is where a menu
   * prints it; ticking one of them is only meaningful where there is a cart.
   */
  extras = input<readonly ExtraItem[]>([]);

  /**
   * Which extras are ticked right now, by id.
   *
   * Local to the row and reset the moment it is added, because a tick is part
   * of building *one* line rather than a preference about the dish. A guest
   * who adds a pizza with extra cheese and then taps add again means a second
   * plain pizza unless they say otherwise - and a picker that stayed ticked
   * would quietly charge them for cheese they never asked for a second time.
   */
  private readonly ticked = signal<readonly string[]>([]);

  /** Whether the picker has anything to draw on this row. */
  readonly hasExtras = computed(() => this.extras().length > 0);

  /**
   * Whether this row draws the extras picker.
   *
   * Also decides where the add button goes: a row with a picker puts it under
   * the boxes, because a button above them is one the guest taps before
   * reading them. Nothing is offered on an unavailable dish - extras on
   * something the kitchen will not serve is a control that leads nowhere.
   */
  readonly showExtrasPicker = computed(
    () =>
      this.canAddToCart() &&
      this.hasExtras() &&
      !this.isUnavailable(this.item()),
  );

  isTicked(extraId: string): boolean {
    return this.ticked().includes(extraId);
  }

  /** What one extra adds, rendered beside its name. */
  extraPriceLabel(extra: ExtraItem): string {
    const symbol = this.currencySymbol();

    return symbol ? `+${extra.price} ${symbol}` : `+${extra.price}`;
  }

  toggleExtra(extraId: string, checked: boolean): void {
    this.ticked.update((ids) =>
      checked
        ? ids.includes(extraId)
          ? ids
          : [...ids, extraId]
        : ids.filter((id) => id !== extraId),
    );
  }

  createBiteClick = output<MenuItem>();

  /**
   * The dish, and the variant where the row is one.
   *
   * Both, rather than the row's own item, because a cart line is a dish *and* a
   * size: "large Margherita" is one thing to order and two things on the menu,
   * and a row that emitted only itself would make the cart guess which dish the
   * large belongs to.
   */
  addToCartClick = output<MenuItemSelection>();

  onAddToCartClick(itemData: MenuItem | undefined): void {
    const parent = this.parentItem();

    if (!itemData || this.isUnavailable(itemData)) {
      return;
    }

    // Taken in the menu's order rather than in the order they were tapped, so
    // a line reads the way the section it came from is printed. The cart's key
    // sorts the ids anyway, so this is about what the guest sees rather than
    // about which row they land on.
    const ticked = this.extras().filter((extra) => this.isTicked(extra.id));

    this.addToCartClick.emit({
      ...(parent ? { item: parent, variant: itemData } : { item: itemData }),
      ...(ticked.length ? { extras: [...ticked] } : {}),
    });

    this.ticked.set([]);
  }

  onCreateBiteClick(itemData: MenuItem | undefined): void {
    if (itemData && !this.isUnavailable(itemData)) {
      this.createBiteClick.emit(itemData);
    }
  }

  isUnavailable(itemData: MenuItem | undefined): boolean {
    return !isMenuVariantAvailable(this.parentItem(), itemData);
  }
}
