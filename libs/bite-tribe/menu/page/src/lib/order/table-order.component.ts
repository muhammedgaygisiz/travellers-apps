import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
} from '@angular/core';
import {
  IonButton,
  IonContent,
  IonFooter,
  IonIcon,
  IonInput,
  IonSpinner,
  IonToolbar,
} from '@ionic/angular/standalone';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { TranslocoPipe } from '@jsverse/transloco';
import { RouterLink } from '@angular/router';
import { PageComponent } from 'common/ui/page';
import { PATH, currencyCodes } from 'utils';
import {
  TABLE_ORDER_BLOCKED_KEYS,
  TableCartService,
  TableOrderService,
  type TableCartLine,
  type TableOrderView,
} from 'bite-tribe/table-order-data-access';
import { MenuComponent } from '../components/menu/menu.component';
import type { MenuItemSelection } from '../components/menu-item/menu-item.component';

/**
 * The screen a guest at a table orders from (GitHub issue #1103).
 *
 * ## Why it is here and not in the table session library
 *
 * It renders `bt-menu`, which lives in this library. The Nx boundary rules say
 * a `type:feature` library may not depend on another `type:feature` library, so
 * the scan screen - a feature in `bite-tribe/table-session` - cannot reach the
 * renderer, and a copy of it in that library is how two menus start disagreeing
 * about what an unavailable dish looks like. The screen therefore sits beside
 * the public menu, which is the other guest-facing thing that renders one.
 *
 * The cart and the submission are in `bite-tribe/table-order-data-access`, so
 * what is here is layout and narrowing and nothing else.
 *
 * ## Public, like the two screens either side of it
 *
 * No auth guard. The guest is signed in anonymously by the scan screen before
 * they get here, and `authGuard` does not accept an anonymous session - so
 * putting one on this route would lock out the only people it is for.
 *
 * ## Why the states are narrowed here and not in the template
 *
 * `strictTemplates` cannot narrow a discriminated union through a `@switch` on
 * a signal call, and `$any` would turn off the checking for every field behind
 * it. So each state is a computed that answers `undefined` when it is not the
 * current one, exactly as the scan screen and the public menu do.
 */
@Component({
  selector: 'lib-table-order',
  imports: [
    PageComponent,
    IonContent,
    IonFooter,
    IonToolbar,
    IonButton,
    IonIcon,
    IonInput,
    IonSpinner,
    TranslocoPipe,
    RouterLink,
    MenuComponent,
  ],
  // Both, and at the component rather than at the root. A cart belongs to the
  // screen a guest is building it on: rooted, it would survive the guest
  // leaving the table and hand the next party the last one's dishes.
  // `TableOrderService` injects the cart, so listing only the service leaves it
  // with nothing to inject - which is a runtime failure on arrival, not a
  // compile error.
  providers: [TableCartService, TableOrderService],
  templateUrl: 'table-order.component.html',
  styleUrl: 'table-order.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableOrder implements OnInit {
  protected readonly service = inject(TableOrderService);

  protected readonly cart = this.service.cart;
  protected readonly isBusy = this.service.isBusy;
  protected readonly canSubmit = this.service.canSubmit;
  protected readonly refusal = this.service.lastRefusal;

  private readonly state = this.service.state;

  private whenKind<TKind extends TableOrderView['kind']>(
    kind: TKind,
  ): () => Extract<TableOrderView, { kind: TKind }> | undefined {
    return computed(() => {
      const state = this.state();

      return state.kind === kind
        ? (state as Extract<TableOrderView, { kind: TKind }>)
        : undefined;
    });
  }

  protected readonly loading = this.whenKind('loading');
  protected readonly ordering = this.whenKind('ordering');
  protected readonly placed = this.whenKind('placed');
  protected readonly blocked = this.whenKind('blocked');
  protected readonly failure = this.whenKind('failed');

  /**
   * The currency the prices on screen are in.
   *
   * Read off whichever state has one, because the confirmation outlives the
   * menu: once the order lands the view is `placed`, and a symbol taken from
   * the ordering state alone would render the total the guest just agreed to as
   * a bare number - the one figure on the screen that must not be ambiguous.
   * The order carries its own currency for exactly this reason.
   */
  private readonly currencyCode = computed(
    () => this.ordering()?.currency ?? this.placed()?.order.currency ?? '',
  );

  /**
   * The symbol for it, or the code where none is known.
   *
   * The same fallback `menu-item` uses, and deliberately: the cart and the
   * dishes above it show one price each and must not show them differently.
   */
  protected readonly currencySymbol = computed(() => {
    const code = this.currencyCode();

    if (!code) {
      return '';
    }

    return currencyCodes.find((entry) => entry.code === code)?.symbol ?? code;
  });

  ngOnInit(): void {
    void this.service.load();
  }

  ionViewDidEnter(): void {
    FirebaseAnalytics.setCurrentScreen({ screenName: 'Table Order' });
  }

  /** The restaurant and the table, for the sentences that name them. */
  protected placeOf(view: {
    context: { restaurant: { name: string }; table: { label: string } };
  }): Record<string, string> {
    return {
      restaurant: view.context.restaurant.name,
      table: view.context.table.label,
    };
  }

  /** A price with the menu's symbol, or the bare number where there is none. */
  protected priceLabel(amount: number): string {
    const symbol = this.currencySymbol();

    return symbol ? `${amount} ${symbol}` : `${amount}`;
  }

  /** What one row of the cart comes to. */
  protected lineTotal(line: TableCartLine): number {
    return (line.variant?.price ?? line.item.price) * line.quantity;
  }

  /** The row's name, with the size where the guest chose one. */
  protected lineName(line: TableCartLine): string {
    return line.variant
      ? `${line.item.name} (${line.variant.name})`
      : line.item.name;
  }

  /**
   * The sentence a blocked screen is told with.
   *
   * Read off one table rather than built from a prefix here, so a reason the
   * backend can produce and no locale file covers is a compile error in the
   * table instead of a blank line in front of a guest.
   */
  protected blockedKey(reason: keyof typeof TABLE_ORDER_BLOCKED_KEYS): string {
    return TABLE_ORDER_BLOCKED_KEYS[reason];
  }

  /**
   * The name to put in a refusal sentence.
   *
   * The menu's name where the backend could still read one, and the cart's
   * otherwise - a dish that has been deleted has no name left on the menu, and
   * the guest still needs to know which row to take out.
   */
  protected refusedName(): string {
    const item = this.refusal()?.item;

    if (!item) {
      return '';
    }

    const inCart = this.cart
      .lines()
      .find((line) => line.item.id === item.menuItemId);

    return item.name || inCart?.item.name || '';
  }

  protected addToCart(selection: MenuItemSelection): void {
    this.service.add(selection);
  }

  protected onNotes(key: string, value: string | number | null): void {
    this.service.setNotes(key, String(value ?? ''));
  }

  protected submit(): void {
    void this.service.submit();
  }

  protected retry(): void {
    void this.service.retry();
  }

  protected orderAgain(): void {
    void this.service.orderAgain();
  }

  /** Where the menu lives, for a guest who cannot order but can still read. */
  protected menuPath(restaurantId: string): string[] {
    return ['/', PATH.PUBLIC_MENU, restaurantId];
  }
}
