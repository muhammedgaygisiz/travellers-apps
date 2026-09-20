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
import { NgTemplateOutlet } from '@angular/common';
import { PageComponent } from 'common/ui/page';
import { PATH, currencyCodes } from 'utils';
import {
  TABLE_ASSISTANCE_REFUSAL_KEYS,
  TABLE_ORDER_BLOCKED_KEYS,
  TABLE_ORDER_CLOSED_KEYS,
  TABLE_ORDER_STATUS_KEYS,
  TableAssistanceService,
  TableCartService,
  TableOrderHistoryService,
  TableOrderService,
  TableOrderSubmissionService,
  type TableCartLine,
  type TableOrderView,
} from 'bite-tribe/table-order-data-access';
import { orderLineUnitPrice, TABLE_ASSISTANCE_KINDS } from 'model';
// Aliased because the screen's own class is called `TableOrder` too, and a
// merged declaration of the two is a compile error rather than a shadowing.
import type {
  OrderLineSnapshot,
  TableAssistanceKind,
  TableOrder as TableOrderModel,
} from 'model';
import { MenuComponent } from '../components/menu/menu.component';
import type { MenuItemSelection } from '../components/menu-item/menu-item.component';

/**
 * The symbol for a currency code, or the code itself where none is known.
 *
 * A free function because two things need it now: the menu's currency, which
 * the whole screen is priced in, and the currency each *sent* order carries -
 * and an order outlives the menu state it was built from.
 */
const symbolOf = (code: string): string => {
  if (!code) {
    return '';
  }

  return currencyCodes.find((entry) => entry.code === code)?.symbol ?? code;
};

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
    NgTemplateOutlet,
    MenuComponent,
  ],
  // Both, and at the component rather than at the root. A cart belongs to the
  // screen a guest is building it on: rooted, it would survive the guest
  // leaving the table and hand the next party the last one's dishes.
  // `TableOrderService` injects the cart, so listing only the service leaves it
  // with nothing to inject - which is a runtime failure on arrival, not a
  // compile error.
  //
  // The history joins them for the same reason and with the same lifetime: its
  // two Firestore listeners belong to the screen, and rooting them would keep a
  // guest's session and orders on a listener after they walked out of the
  // restaurant (GitHub issue #1104).
  //
  // The assistance pair joins them for the same reason and with the same
  // lifetime: two more Firestore listeners that belong to the screen, and
  // rooting them would leave a guest's table on a listener after they walked
  // out of the restaurant (GitHub issue #1106).
  //
  // The submission joins them, and its lifetime is the reason it is listed
  // rather than rooted: what it keeps between attempts is on the device, not in
  // the instance, so a new screen reads the same record back and a stale
  // instance holds nothing worth keeping (GitHub issue #1108).
  providers: [
    TableCartService,
    TableOrderHistoryService,
    TableAssistanceService,
    TableOrderSubmissionService,
    TableOrderService,
  ],
  templateUrl: 'table-order.component.html',
  styleUrl: 'table-order.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableOrder implements OnInit {
  protected readonly service = inject(TableOrderService);

  protected readonly cart = this.service.cart;
  protected readonly history = this.service.history;
  protected readonly assistance = this.service.assistance;

  /** The two things the guest can ask for, in the order they are offered. */
  protected readonly assistanceKinds = TABLE_ASSISTANCE_KINDS;
  protected readonly isBusy = this.service.isBusy;
  protected readonly canSubmit = this.service.canSubmit;
  protected readonly refusal = this.service.lastRefusal;

  /** The submission the phone could not confirm, while there is one. */
  protected readonly unconfirmed = this.service.unconfirmed;

  /** False while one is unresolved, which freezes every cart control. */
  protected readonly canEditCart = this.service.canEditCart;

  /** Which attempt is running, so a slow send can say it has not given up. */
  protected readonly attempt = this.service.attempt;

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
  protected readonly currencySymbol = computed(() =>
    symbolOf(this.currencyCode()),
  );

  /**
   * The currency every order so far is priced in, or nothing where they differ.
   *
   * Two currencies in one visit is close to impossible and not quite: an owner
   * who restates the menu mid-meal has the guest's next order refused as
   * `currencyChanged` (issue #1103), and the guest who re-adds the dish then
   * holds one order in each. Summing those would put one number under two
   * currencies, so the running total is simply not shown - each order still
   * states its own, which is the part that must never be ambiguous.
   */
  protected readonly historyCurrency = computed(() => {
    const currencies = new Set(this.history.orders().map((o) => o.currency));

    return currencies.size === 1 ? [...currencies][0] : '';
  });

  /**
   * Whether a running total across orders is worth a line of its own.
   *
   * One order does not need one: its own total says the same thing, one line
   * higher up.
   */
  protected readonly showsRunningTotal = computed(
    () => this.history.orders().length > 1 && this.historyCurrency() !== '',
  );

  /**
   * The sentence for a session that can send nothing further, or none.
   *
   * Driven by the session listener rather than by the last refusal, which is
   * what makes it arrive while the guest is still reading the menu instead of
   * after they have built a cart and tapped send (GitHub issue #1104).
   */
  protected readonly closedNoteKey = computed(() => {
    const status = this.history.status();

    return status && status !== 'active' ? TABLE_ORDER_CLOSED_KEYS[status] : '';
  });

  /**
   * Whether asking for a waiter is worth offering at all.
   *
   * The same predicate the send button uses, and deliberately: a table the
   * restaurant has closed, a session that timed out and a party staff have not
   * seated yet are exactly the states in which the backend refuses a signal,
   * and a button that is always there and always refused teaches a guest to
   * ignore the screen. An unknown session answers yes, as it does for an order
   * - the backend's reason is truer than one invented here.
   */
  protected readonly canAskForHelp = computed(() =>
    this.history.acceptsOrders(),
  );

  /**
   * What one button says, which is its state as much as its label.
   *
   * Two labels rather than three. A signal that is up disables the button and
   * says so on it, because the tap the guest is about to make again would do
   * nothing; an acknowledged one re-enables the button at its ordinary label
   * and puts "somebody is on their way" beside it - a button reading that
   * sentence would be a button promising to fetch somebody who is already
   * walking over.
   */
  protected assistanceKey(kind: TableAssistanceKind): string {
    const state = this.isAssistanceOpen(kind) ? 'open' : 'idle';

    return `table-assistance-${kind}-${state}`;
  }

  /** The line under a button somebody has already answered, or none. */
  protected assistanceNoteKey(kind: TableAssistanceKind): string {
    return this.isAssistanceAcknowledged(kind)
      ? `table-assistance-${kind}-acknowledged`
      : '';
  }

  /** Whether this kind's signal is still waiting for somebody. */
  protected isAssistanceOpen(kind: TableAssistanceKind): boolean {
    return this.assistance.stateOf(kind) === 'open';
  }

  /** Whether staff have said they are coming. */
  protected isAssistanceAcknowledged(kind: TableAssistanceKind): boolean {
    return this.assistance.stateOf(kind) === 'acknowledged';
  }

  /**
   * The sentence a declined request is told with.
   *
   * Read off one table rather than built from a prefix here, so a reason the
   * backend can return and no locale file covers is a compile error in the
   * table instead of a blank line in front of a guest trying to pay.
   */
  protected assistanceRefusalKey(
    reason: keyof typeof TABLE_ASSISTANCE_REFUSAL_KEYS,
  ): string {
    return TABLE_ASSISTANCE_REFUSAL_KEYS[reason];
  }

  protected askFor(kind: TableAssistanceKind): void {
    void this.assistance.ask(kind);
  }

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

  /** A price in a currency of its own, for a row the menu no longer prices. */
  protected priceLabelIn(amount: number, currency: string): string {
    const symbol = symbolOf(currency);

    return symbol ? `${amount} ${symbol}` : `${amount}`;
  }

  /** The sentence one order's status is told with. */
  protected statusKey(order: TableOrderModel): string {
    return TABLE_ORDER_STATUS_KEYS[order.status];
  }

  /** One line of a sent order, with the size where the guest chose one. */
  protected orderLineName(line: OrderLineSnapshot): string {
    return line.variantName ? `${line.name} (${line.variantName})` : line.name;
  }

  /**
   * What one line of a sent order came to.
   *
   * Through `orderLineUnitPrice` rather than `line.price`, so a line ordered
   * with extras reads as what it cost rather than as what the dish alone did
   * (GitHub issue #1598).
   */
  protected orderLineTotal(line: OrderLineSnapshot): number {
    return orderLineUnitPrice(line) * line.quantity;
  }

  /**
   * What one row of the cart comes to.
   *
   * Priced through the same snapshot the order is built from rather than off
   * the dish, so the row, the running total below it and the total the
   * restaurant records are one arithmetic (GitHub issue #1598). It was a
   * ternary over `variant?.price` until extras existed, and a second place to
   * forget them.
   */
  protected lineTotal(line: TableCartLine): number {
    return (
      orderLineUnitPrice({
        price: line.variant?.price ?? line.item.price,
        extras: line.extras.map((extra) => ({
          extraId: extra.id,
          name: extra.name,
          price: extra.price,
        })),
      }) * line.quantity
    );
  }

  /** The row's name, with the size where the guest chose one. */
  protected lineName(line: TableCartLine): string {
    return line.variant
      ? `${line.item.name} (${line.variant.name})`
      : line.item.name;
  }

  /**
   * The extras on a row, as one line of small print under its name.
   *
   * A sentence rather than a list, because a cart row on a phone is already
   * three controls deep and a second bulleted list inside it reads as another
   * dish. Empty where nothing was ticked, and the template draws nothing.
   */
  protected lineExtras(line: TableCartLine): string {
    return line.extras.map((extra) => extra.name).join(', ');
  }

  /** The same, for a line of an order that has already been sent. */
  protected orderLineExtras(line: OrderLineSnapshot): string {
    return (line.extras ?? []).map((extra) => extra.name).join(', ');
  }

  /**
   * The extra a refusal is about, named for the sentence (issue #1598).
   *
   * The menu's name where the backend could still read one, and the cart's
   * otherwise, on exactly the terms {@link refusedName} works: an extra that
   * has been deleted has no name left on the menu, and the guest still needs
   * to know which tick to take off.
   */
  protected refusedExtraName(): string {
    const item = this.refusal()?.item;

    if (!item?.extraId) {
      return '';
    }

    const ticked = this.cart
      .lines()
      .flatMap((line) => line.extras)
      .find((extra) => extra.id === item.extraId);

    return item.extraName || ticked?.name || '';
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

  /**
   * What the send button says, which is its state as much as its label.
   *
   * Three labels. A cart nobody has sent yet is "send to the kitchen"; one the
   * phone could not confirm is "check this order", because the tap is a
   * question rather than a second order; and a send in flight names the attempt
   * it is on, so a spinner turning for four seconds is visibly a phone still
   * trying rather than one that has stopped (GitHub issue #1108).
   */
  protected sendKey(): string {
    if (this.isBusy()) {
      return this.attempt() > 1
        ? 'table-order-retrying'
        : 'table-order-sending';
    }

    return this.unconfirmed() ? 'table-order-check' : 'table-order-send';
  }

  /** The sentence an unresolved submission is told with. */
  protected unconfirmedKey(): string {
    return this.unconfirmed()?.delivery === 'notSent'
      ? 'table-order-unconfirmed-notSent'
      : 'table-order-unconfirmed-unknown';
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
