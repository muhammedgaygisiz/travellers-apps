import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { IonButton } from '@ionic/angular/standalone';
import { isMenuVariantAvailable } from 'model';
import type { MenuItem } from 'model';
import { TranslocoPipe } from '@jsverse/transloco';
import { currencyCodes } from 'utils';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'menu-item',
  templateUrl: './menu-item.component.html',
  styleUrl: './menu-item.component.scss',
  imports: [IonButton, TranslocoPipe],
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

  createBiteClick = output<MenuItem>();

  onCreateBiteClick(itemData: MenuItem | undefined): void {
    if (itemData && !this.isUnavailable(itemData)) {
      this.createBiteClick.emit(itemData);
    }
  }

  isUnavailable(itemData: MenuItem | undefined): boolean {
    return !isMenuVariantAvailable(this.parentItem(), itemData);
  }
}
